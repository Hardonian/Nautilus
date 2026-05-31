// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { runNpmLinkOrShim } from "../../../lib/actions/dev/npm-link-or-shim";
import { NemoClawCommand } from "../../../lib/cli/nemoclaw-oclif-command";

export default class InternalDevNpmLinkOrShimCommand extends NemoClawCommand {
  static hidden = true;
  static strict = true;
  static summary = "Internal: link the checkout CLI or create a dev shim";
  static description = "Run npm link, falling back to a user-local NemoClaw development shim.";
  static usage = ["internal dev npm-link-or-shim"];
  static examples = ["<%= config.bin %> internal dev npm-link-or-shim"];

  public async run(): Promise<void> {
    await this.parse(InternalDevNpmLinkOrShimCommand);
    const result = runNpmLinkOrShim({ repoRoot: this.config.root });
    if (result.status !== 0) process.exit(result.status);
  }
}
