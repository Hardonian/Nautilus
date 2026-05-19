<!-- SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved. -->
<!-- SPDX-License-Identifier: Apache-2.0 -->

# 🤝 Contributing to Nautilus & NemoClaw

Welcome! We are thrilled that you are looking to contribute to Nautilus and the NemoClaw runtime. By contributing to this project, you help define the vanguard of deterministic, production-grade AI infrastructure.

This guide outlines our development workflow, collaboration standards, and how to get your environment up and running quickly.

---

## 🌟 Our Philosophy

Nautilus is built on the principles of **determinism, safety, and operational transparency**. We believe that:
*   **Quality > Quantity:** Clean, well-tested, and deterministic PRs are highly valued.
*   **Truth First:** We do not disguise unfinished architecture or fake telemetry. An honest degraded state is better than simulated success.
*   **Open and Safe:** We maintain a supportive, inclusive space for both human engineers and AI coding assistants.

---

## 🗺️ Choose Your Track

Whether you're writing code, fixing docs, or orchestrating subagents, we have a dedicated path for you:

### 💻 Core Engine Developer
*   **Focus:** TypeScript CLI, blueprint runtime integration, and event fabric contracts.
*   **Prerequisites:** Node.js 22.16+, Docker.
*   **Key Files:** `nemoclaw/`, `src/lib/`, `core/`.

### 🧪 Integration & Threat Testing
*   **Focus:** Sandbox isolation, network policy presets, and security exploits.
*   **Prerequisites:** Python 3.11+, Docker, and `uv`.
*   **Key Files:** `nemoclaw-blueprint/`, `test/`.

### ✍️ Technical Writer
*   **Focus:** Core architecture guides, CLI command references, and user onboarding.
*   **Prerequisites:** Python 3.11+, `uv`.
*   **Key Files:** `docs/`.

### 🤖 AI Coding Agents & Copilots
*   **Focus:** Automated patches, type-safety improvements, and PR reviews.
*   **Prerequisites:** Explicit context loading via `AGENTS.md`.
*   **Key Files:** `.agents/skills/`.

---

## 🛠️ Developer Environment Setup

Follow these steps to bootstrap your local environment on Linux, macOS, or WSL2.

### 1. Prerequisites
Make sure the following dependencies are installed:
*   **Node.js** 22.16+ and **npm** 10+
*   **Python** 3.11+ (for blueprints and docs)
*   **Docker** (active daemon)
*   **[uv](https://docs.astral.sh/uv/)** (Python package manager)
*   **hadolint** (for Dockerfile validation)

### 2. Initial Setup
```bash
# Clone the repository and install root workspace dependencies
npm install

# Build the TypeScript runtime plugin
cd nemoclaw
npm install
npm run build
cd ..

# Sync Python blueprint dependencies
cd nemoclaw-blueprint
uv sync
cd ..
```

### 3. Link CLI for Local CLI Development
To make the `nemoclaw` command globally available locally for testing, link it inside the repository root:
```bash
npm link
nemoclaw --version
```
*To clean up when done, simply run:* `npm unlink -g nemoclaw`

---

## 🔄 Daily Workflow Command Center

Use these standard commands during your daily development lifecycle:

| Target | Command | Purpose |
|:---|:---|:---|
| **Linting** | `npm run lint` | Run Biome linter across the workspace. |
| **Formatting** | `npm run format` | Auto-format TypeScript, JS, and JSON files. |
| **Type Checking** | `npm run typecheck` | Run type-checks for the entire codebase. |
| **Type Checking CLI** | `npm run typecheck:cli` | Check only the CLI components. |
| **Tests** | `npm test` | Run the main unit and integration test suite. |
| **Docs Preview** | `npm run docs:live` | Build and live-serve documentation. |

---

## 🚦 Pull Request Lifecycle & Hygiene

To maintain a high velocity and high-quality review process, we practice the following hygiene standards:

### 1. Healthy PR Queue
We limit contributors to **fewer than 10 open PRs** at any time. This prevents developer burnout, avoids stale branch drift, and ensures code review remains focused and prompt.

### 2. External Links Policy
To keep our repository secure and maintain a clean, verified dependency tree:
*   Do not link to unofficial community templates, awesome-lists, wrapper projects, or third-party repositories.
*   Links to official documentation (e.g., Node.js, Python, uv) or industry standards (e.g., Conventional Commits) are welcome.
*   *Why:* Unofficial external sites are outside of our control and can change ownership or present security risks.

### 3. Commit Guidelines
We enforce [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>(<scope>): <description>
```

**Common Types:**
*   `feat` — Net new capability or command.
*   `fix` — Bug fixes.
*   `docs` — Documentation additions or improvements.
*   `chore` — Routine maintenance (dependencies, config changes).
*   `refactor` — Restructuring code without changing behavior.
*   `test` — Adding or stabilizing tests.

**Example:**
```text
feat(cli): add --policy flag to nemoclaw onboard
```

---

## 🔒 Security First

Do not report security issues or potential vulnerabilities via public issues or pull requests. Please refer to [SECURITY.md](SECURITY.md) to submit coordinate disclosures privately through our secure channels.

Thank you for contributing to the future of deterministic AI! 🌌
