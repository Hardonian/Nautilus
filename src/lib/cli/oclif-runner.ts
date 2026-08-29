// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { Config as OclifConfig } from "@oclif/core";

import { CLI_DISPLAY_NAME, CLI_NAME } from "./branding";

export interface OclifCommandRunOptions {
  rootDir: string;
  error?: (message?: string) => void;
  exit?: (code: number) => never;
}

function getOclifExitCode(error: unknown): number | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const oclif = (error as { oclif?: { exit?: number } }).oclif;
  return typeof oclif?.exit === "number" ? oclif.exit : null;
}

function isOclifParseError(error: unknown): boolean {
  const name =
    error && typeof error === "object"
      ? (error as { constructor?: { name?: string } }).constructor?.name
      : "";
  return name === "NonExistentFlagsError" || name === "UnexpectedArgsError" || name === "CLIError";
}

function isOclifExitError(error: unknown): boolean {
  const name =
    error && typeof error === "object"
      ? (error as { constructor?: { name?: string } }).constructor?.name
      : "";
  return name === "ExitError";
}

function formatOclifError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }

  return String(error).trim();
}

function applyBrandedBin(config: OclifConfig): void {
  const pjson = {
    ...config.pjson,
    oclif: {
      ...config.pjson.oclif,
      bin: CLI_NAME,
    },
  };
  // config.runCommand() calls Command.run(), which reloads from the root
  // plugin. Patch both config and root plugin metadata so alias launchers keep
  // branded oclif help output.
  config.bin = CLI_NAME;
  config.pjson = pjson;
  config.options.pjson = pjson;
  for (const plugin of config.plugins.values()) {
    if (plugin.root === config.root) {
      plugin.pjson = pjson;
      plugin.options.pjson = pjson;
    }
  }

  // oclif loads help metadata from oclif.manifest.json when it is present.
  // That manifest is generated with the canonical NemoClaw branding, so alias
  // launchers must brand the loaded metadata as well as the command class and
  // bin name. Keep this runtime-only: the published manifest remains stable.
  const brand = (value: string): string =>
    value.replaceAll("NemoClaw", CLI_DISPLAY_NAME).replace(/\bnemoclaw\b/g, CLI_NAME);
  const brandValues = (value: unknown): void => {
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (typeof child === "string") {
        (value as Record<string, unknown>)[key] = brand(child);
      } else {
        brandValues(child);
      }
    }
  };
  for (const command of config.commands ?? []) brandValues(command);
}

async function runWithConfig(
  config: OclifConfig,
  commandId: string,
  args: string[],
  opts: OclifCommandRunOptions,
): Promise<void> {
  applyBrandedBin(config);
  const errorLine = opts.error ?? console.error;
  const exit = opts.exit ?? ((code: number) => process.exit(code));

  try {
    await config.runCommand(commandId, args);
  } catch (error) {
    const exitCode = getOclifExitCode(error);
    if (exitCode === 0) {
      // #2666: only oclif's own ExitError(0) is an intentional graceful
      // exit (e.g. Command.exit(0) — message is the synthetic "EEXIT: 0").
      // Any OTHER error that happens to carry oclif.exit === 0 used to be
      // silently swallowed here, producing exit 0 + completely empty
      // stdout/stderr. Surface its message — and fall back to a generic
      // line if formatOclifError() returns empty so we never reintroduce
      // the silent path for an error whose message happens to be blank.
      if (!isOclifExitError(error)) {
        const message = formatOclifError(error) || "Command exited with no output.";
        errorLine(`  ${message}`);
      }
      process.exitCode = 0;
      return;
    }

    if (isOclifParseError(error)) {
      errorLine(`  ${formatOclifError(error)}`);
      exit(exitCode ?? 1);
    }

    // NCQ #3180: oclif's Command.exit(code) throws an ExitError carrying
    // `oclif.exit`. Treat that as a graceful exit with the requested code
    // so we don't leak a raw `at Object.exit (... /@oclif/core/...)` stack
    // trace to the user. Other oclif error classes (e.g. RequiredArgsError)
    // are left to bubble up so oclif's own handler still prints them.
    if (isOclifExitError(error) && typeof exitCode === "number") {
      exit(exitCode);
    }

    throw error;
  }
}

export async function runRegisteredOclifCommand(
  commandId: string,
  args: string[],
  opts: OclifCommandRunOptions,
): Promise<void> {
  const config = await OclifConfig.load(opts.rootDir);
  await runWithConfig(config, commandId, args, opts);
}

export async function runOclifArgv(args: string[], opts: OclifCommandRunOptions): Promise<void> {
  const config = await OclifConfig.load(opts.rootDir);
  const match = config.commands
    .map((command) => ({ command, tokens: command.id.split(":") }))
    .filter(({ tokens }) => tokens.every((token, index) => args[index] === token))
    .sort((a, b) => b.tokens.length - a.tokens.length)[0];

  if (!match) {
    throw new Error(`Unknown oclif command: ${args.join(" ")}`);
  }

  await runWithConfig(config, match.command.id, args.slice(match.tokens.length), opts);
}
