import { run } from "@oclif/core";

async function main() {
  try {
    await run(["run-ci", "--action", "test-proofpack", "--fail-on-degraded"], process.cwd());
  } catch (err: any) {
    // Oclif might exit process or throw an error. We want the JSON output to be our proofpack.
    console.error("Caught error:", err);
    process.exit(err.oclif?.exit || 1);
  }
}

main();
