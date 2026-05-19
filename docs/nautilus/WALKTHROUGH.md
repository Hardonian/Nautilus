<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# Nautilus Operator Walkthrough (Terminal-First)

## Quick operator commands

```bash
npm run nautilus:demo
npm run nautilus:show-proofpack
npm run nautilus:show-proofpack -- partial
npm run nautilus:show-replay
```

## MVP architecture diagrams

### Execution flow

```text
operator command
  -> deterministic scenario fixture
  -> contract validation
  -> state transitions emitted
  -> scenario output (ok/degraded/failure truth)
```

### Proofpack flow

```text
scenario evidence
  -> proofpack sample builder
  -> completeness status (complete|partial)
  -> degradedReasons (if partial)
```

### Replay flow

```text
evidence snapshot
  -> replay report builder
  -> reproducedFinalState
  -> read_only replay marker (no side effects)
```

### Degraded-state flow

```text
dependency gap/failure semantic
  -> degraded=true or finalState=failed
  -> failure + evidence events emitted
  -> operator triage (inspect, do not over-claim)
```

## Deterministic transcript capture

```bash
mkdir -p docs/nautilus/transcripts
npm run nautilus:demo > docs/nautilus/transcripts/nautilus-demo.json
npm run nautilus:show-proofpack -- partial > docs/nautilus/transcripts/proofpack-partial.json
npm run nautilus:show-replay > docs/nautilus/transcripts/replay.json
```

## Asciinema support (if installed)

```bash
cat > scripts/nautilus/asciinema-demo.sh <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail
npm run nautilus:demo
npm run nautilus:show-proofpack -- partial
npm run nautilus:show-replay
SCRIPT
chmod +x scripts/nautilus/asciinema-demo.sh
asciinema rec docs/nautilus/transcripts/nautilus-demo.cast --command "bash scripts/nautilus/asciinema-demo.sh"
```

## Expected output interpretation

- `fixture=true` and `deterministicSample=true` prove sample mode.
- `degraded=true` means partial truth; inspect `failure` and `evidence.events`.
- `finalState=failed` means supported flow reached a terminal failure.
- Unsupported boundaries are documented in `docs/nautilus/UNSUPPORTED.md`.

## Proofpack inspection

```bash
npm run nautilus:show-proofpack | jq '.status, .evidenceCount, .degradedReasons'
npm run nautilus:show-proofpack -- partial | jq '.status, .degradedReasons, .evidence.events | length'
```

- `status=complete` means full sample evidence package.
- `status=partial` means sample package intentionally includes degraded reasons.

## Replay interpretation

```bash
npm run nautilus:show-replay | jq '.replayMode, .reproducedFinalState, .mutationSafe'
```

- `replayMode=read_only` and `mutationSafe=true` mean no external side effects are replayed.

## Example readability checklist

Each `examples/nautilus/*/README.md` includes:
- what this demonstrates
- unsupported vs failed
- how operator should react
- degraded-state explanation
