// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { NemoClawCommand } from "../../cli/nemoclaw-oclif-command";
import { ApiGateway } from "../../gateway/server";
import { Flags } from "@oclif/core";

export default class GatewayStartCommand extends NemoClawCommand {
  static id = "gateway:start";
  static strict = true;
  static summary = "Start the API Gateway server";
  static description = "Starts a lightweight HTTP server to expose status and health endpoints to 3rd-party clients.";
  static usage = ["gateway start [--port <port>]"];
  
  static flags = {
    port: Flags.integer({
      char: "p",
      description: "Port to listen on",
      default: 8080,
    }),
  };

  public async run(): Promise<unknown> {
    const { flags } = await this.parse(GatewayStartCommand);
    const port = flags.port;

    const gateway = new ApiGateway(port);
    this.log(`Starting API Gateway on port ${port}...`);
    await gateway.start();
    this.log(`API Gateway is listening on http://localhost:${port}`);

    // Wait indefinitely to keep the process alive
    return new Promise(() => {
      process.on("SIGINT", async () => {
        this.log("Shutting down API Gateway...");
        await gateway.stop();
        this.exit(0);
      });
    });
  }
}
