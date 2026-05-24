// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as http from "node:http";
import { getStatusReport } from "../inventory-commands";
import { buildStatusCommandDeps } from "../status-command-deps";
import { ROOT } from "../runner";
import { LocalGridNode } from "../core/grid";

const gridNode = new LocalGridNode("gateway-node");

function readRequestBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown): void {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

export class ApiGateway {
  private server: http.Server | null = null;

  constructor(private port: number = 8080) {}

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }
      this.server.close((err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  private async handleRequest(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    if (req.url === "/health" && req.method === "GET") {
      try {
        const deps = buildStatusCommandDeps(ROOT);
        const report = getStatusReport(deps);
        sendJson(res, 200, {
          activeSandboxes: report.sandboxes.filter((s) => s.connected).length,
          totalSandboxes: report.sandboxes.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        sendJson(res, 500, { error: (error as Error).message });
      }
      return;
    }

    if (req.url === "/telemetry" && req.method === "GET") {
      try {
        const deps = buildStatusCommandDeps(ROOT);
        const report = getStatusReport(deps);
        sendJson(res, 200, {
          activeSandboxes: report.sandboxes.filter((s) => s.connected).length,
          totalSandboxes: report.sandboxes.length,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        sendJson(res, 500, { error: (error as Error).message });
      }
      return;
    }

    if (req.url === "/grid/register" && req.method === "POST") {
      try {
        const body = await readRequestBody(req);
        const data = JSON.parse(body) as { url?: string };
        if (!data.url) {
          sendJson(res, 400, { error: "url required" });
          return;
        }
        await gridNode.registerPeer(data.url);
        sendJson(res, 200, { status: "registered" });
      } catch {
        sendJson(res, 400, { error: "invalid request" });
      }
      return;
    }

    if (req.url === "/grid/workload" && req.method === "POST") {
      try {
        const body = await readRequestBody(req);
        const data = JSON.parse(body) as { executionId?: string };
        sendJson(res, 202, { status: "accepted", executionId: data.executionId ?? null });
      } catch {
        sendJson(res, 400, { error: "invalid workload" });
      }
      return;
    }

    const statusMatch = req.url?.match(/^\/sandbox\/([^/]+)\/status$/);
    if (req.method === "GET" && statusMatch) {
      const sandboxName = statusMatch[1];
      try {
        const deps = buildStatusCommandDeps(ROOT);
        const report = getStatusReport(deps);
        const sandbox = report.sandboxes.find((s) => s.name === sandboxName);
        if (!sandbox) {
          sendJson(res, 404, { error: "sandbox not found" });
          return;
        }
        sendJson(res, 200, sandbox);
      } catch (error) {
        sendJson(res, 500, { error: (error as Error).message });
      }
      return;
    }

    sendJson(res, 404, { error: "not found" });
  }
}
