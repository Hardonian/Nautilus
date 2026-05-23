// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import * as http from "node:http";
import { getStatusReport } from "../inventory-commands";
import { buildStatusCommandDeps } from "../status-command-deps";
import { ROOT } from "../runner";

export class ApiGateway {
  private server: http.Server | null = null;

  constructor(private port: number = 8080) {}

  public start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
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

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    if (req.method === "GET") {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      if (req.url === "/telemetry") {
        try {
          const deps = buildStatusCommandDeps(ROOT);
          const report = getStatusReport(deps);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            activeSandboxes: report.sandboxes.filter((s) => s.connected).length,
            totalSandboxes: report.sandboxes.length,
            timestamp: new Date().toISOString(),
          }));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }
      
      const statusMatch = req.url?.match(/^\/sandbox\/([^/]+)\/status$/);
      if (statusMatch) {
        const sandboxName = statusMatch[1];
        try {
          const deps = buildStatusCommandDeps(ROOT);
          const report = getStatusReport(deps);
          // find sandbox by name
          const sandbox = report.sandboxes.find((s) => s.name === sandboxName);
          if (!sandbox) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "sandbox not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(sandbox));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
  }
}
