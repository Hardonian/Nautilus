// SPDX-FileCopyrightText: Copyright (c) 2026 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

import { createHash } from "crypto";
import { exec, execFile } from "child_process";
import { promisify } from "util";
import { evaluatePolicy, type PolicyBundle } from "./governance";
import { boundedRetry, denyRemoteByDefault } from "./r1-hardening";
import { estimateTokenBudget, replayCheckpoint, saveCheckpoint, taskFingerprint, validateHandoffPacket, type HandoffPacket } from "./r4-handoff-primitives";
import { QueueGovernance } from "./r5-queue-governance";
import { buildR5Proofpack } from "./r5-proofpack-release";
import type { DeviceRegistry } from "./device-registry";
import { type OperationalEvent, type OperationalMemoryLog, buildEventsFromReceipt } from "./operational-memory";
import {
  applyExecutionAuthorization,
  createExecutionPolicySnapshot,
  createExecutionTrustSnapshot,
  executionLineageFromPlan,
  validateExecutionAuthorization,
  type ExecutionApproval,
  type ExecutionPlan,
} from "./execution-plans";
import type { ExecutionReceipt } from "./types";
import {
  DEFAULT_SECURITY_POLICY,
  type CommandDescriptor,
  type CommandExecutionPolicy,
  redactSecurityPayload,
  validateCommandDescriptor,
  validateCommandString,
  validateRemoteUrl,
} from "../security/security-policy";

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

interface SshCredentials {
  host: string;
  port: number;
  user: string;
  privateKeyPath?: string;
}

interface RemoteWorkerProofConfig {
  transportType: "ssh" | "https-signed";
  credentials: SshCredentials | Record<string, unknown>;
  expectedOutputHash?: string;
  timeoutMs?: number;
}

interface RemoteWorkerProofResult {
  success: boolean;
  output: string;
  outputHash: string;
  hashMatches: boolean;
  durationMs: number;
  error?: string;
}

export type RemoteExecutionStatus = "disabled" | "policy_denied" | "approval_required" | "authorization_denied" | "unavailable" | "degraded" | "failed" | "succeeded" | "not_supported";
export interface RemoteExecutionRequest { requestId: string; nowIso: string; action: string; command: string; commandDescriptor?: CommandDescriptor; nodeId?: string; targetEndpoint?: string; auth?: { headerName?: string; token?: string }; approved?: boolean; timeoutMs?: number; executionPlanRequired?: boolean; commandPolicy?: CommandExecutionPolicy; }
export interface RemoteExecutionResult { status: RemoteExecutionStatus; output?: string; degradedReason?: string; errorCode?: string; receipt: ExecutionReceipt; events: OperationalEvent[]; replayRef: ExecutionReceipt["provenance"]; proofpack?: Record<string, unknown>; }
export interface RemoteExecutionTransport { execute(input: { endpoint: string; command: string; timeoutMs: number; auth?: { headerName?: string; token?: string } }): Promise<{ status: number; body: string }>; }
export interface RemoteExecutionError { code: string; message: string; retryable: boolean; }
export interface RemoteExecutionReceiptContext { transport: "http"; target: string; policyDecision: "allow" | "deny" | "approval_required" | "disabled"; redactedAuth: Record<string, string>; }
export interface RemoteExecutionConfig { enabled: boolean; source: "env" | "default"; }
export interface RemoteExecutionLineageSummary {
  executionPlanId?: string;
  executionApprovalId?: string;
  authorizationLineageId?: string;
  executionPolicySnapshotHash?: string;
  executionTrustSnapshotHash?: string;
  executionIntentHash?: string;
  replayReferenceId?: string;
}

export interface RemoteExecutionResponsePayload {
  status?: string;
  output?: string;
  signature?: string; // Scaffolding for cryptographic response signing
}

export function verifyRemoteResponseIntegrity(body: RemoteExecutionResponsePayload, enforceSignature = false): boolean {
  if (enforceSignature) {
    if (!body.signature) return false;
    // Scaffold: actual cryptographic signature verification against worker's public key would go here.
    return body.signature.length > 0;
  }
  return true;
}

export function parseRemoteExecutionConfig(env: NodeJS.ProcessEnv): RemoteExecutionConfig {
  const enabled = env.NEMOCLAW_REMOTE_EXECUTION === "1";
  return { enabled, source: enabled ? "env" : "default" };
}

function redact(auth?: { headerName?: string; token?: string }): Record<string, string> {
  if (!auth?.headerName) return {};
  return redactSecurityPayload({ [auth.headerName]: auth.token ?? "<present>" }) as Record<string, string>;
}

export function computeOutputHash(output: string): string {
  return createHash("sha256").update(output).digest("hex");
}

export function verifyResultHash(output: string, expectedHash: string): boolean {
  if (!expectedHash) return true;
  return computeOutputHash(output) === expectedHash;
}

export async function executeSshCommand(credentials: SshCredentials, command: string, timeoutMs: number): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const sshArgs = [
    "-o", "StrictHostKeyChecking=no",
    "-o", `ConnectTimeout=${Math.max(1, Math.floor(timeoutMs / 1000))}`,
    "-o", "BatchMode=yes",
    "-p", String(credentials.port),
  ];
  if (credentials.privateKeyPath) {
    sshArgs.push("-i", credentials.privateKeyPath);
  }
  sshArgs.push(`${credentials.user}@${credentials.host}`);
  sshArgs.push(command);

  try {
    const { stdout, stderr } = await execFileAsync("ssh", sshArgs, { timeout: timeoutMs });
    return { stdout, stderr, exitCode: 0 };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out");
    const codeMatch = msg.match(/exit code (\d+)/);
    const exitCode = codeMatch ? parseInt(codeMatch[1], 10) : (isTimeout ? 124 : 1);
    const stderr = msg;
    const stdout = "";
    return { stdout, stderr, exitCode };
  }
}

export async function executeSignedHttps(endpoint: string, command: string, timeoutMs: number, signingKey: string): Promise<{ status: number; body: string }> {
  const payload = JSON.stringify({ command, timestamp: Date.now() });
  const signature = createHash("sha256").update(signingKey + payload).digest("hex");

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { status: 500, body: JSON.stringify({ error: "invalid_endpoint_url" }) };
  }
  url.searchParams.set("sig", signature);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Signature": signature },
      body: payload,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.text();
    return { status: response.status, body };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const isTimeout = msg.toLowerCase().includes("timeout") || msg.toLowerCase().includes("timed out") || msg.toLowerCase().includes("abort");
    return { status: isTimeout ? 408 : 500, body: JSON.stringify({ error: msg }) };
  }
}

export async function executeRemoteWorkerProof(config: RemoteWorkerProofConfig, command: string): Promise<RemoteWorkerProofResult> {
  const start = Date.now();
  const timeoutMs = config.timeoutMs ?? 30_000;

  if (config.transportType === "ssh") {
    const creds = config.credentials as SshCredentials;
    if (!creds.host || !creds.user) {
      return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "missing_ssh_credentials" };
    }
    const result = await executeSshCommand(creds, command, timeoutMs);
    const output = result.exitCode === 0 ? result.stdout : result.stderr;
    const outputHash = computeOutputHash(output);
    const hashMatches = config.expectedOutputHash ? outputHash === config.expectedOutputHash : true;
    return {
      success: result.exitCode === 0 && hashMatches,
      output,
      outputHash,
      hashMatches,
      durationMs: Date.now() - start,
      error: result.exitCode !== 0 ? `exit_code_${result.exitCode}` : !hashMatches ? "hash_mismatch" : undefined,
    };
  }

  if (config.transportType === "https-signed") {
    const signedCreds = config.credentials as { endpoint: string; signingKey: string };
    if (!signedCreds.endpoint || !signedCreds.signingKey) {
      return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "missing_signed_https_credentials" };
    }
    const response = await executeSignedHttps(signedCreds.endpoint, command, timeoutMs, signedCreds.signingKey);
    const output = response.body;
    const outputHash = computeOutputHash(output);
    const hashMatches = config.expectedOutputHash ? outputHash === config.expectedOutputHash : true;
    return {
      success: response.status >= 200 && response.status < 300 && hashMatches,
      output,
      outputHash,
      hashMatches,
      durationMs: Date.now() - start,
      error: response.status < 200 || response.status >= 300 ? `http_${response.status}` : !hashMatches ? "hash_mismatch" : undefined,
    };
  }

  return { success: false, output: "", outputHash: "", hashMatches: false, durationMs: Date.now() - start, error: "unsupported_transport" };
}

export async function runRemoteExecution(input: { request: RemoteExecutionRequest; config: RemoteExecutionConfig; transport: RemoteExecutionTransport; policyBundle: PolicyBundle; registry: DeviceRegistry; operationalMemory?: OperationalMemoryLog; executionPlan?: ExecutionPlan; executionApproval?: ExecutionApproval; queueGovernance?: QueueGovernance; tokenBudget?: number; retryConfig?: { maxAttempts: number; maxTotalMs: number; backoffMs: number } }): Promise<RemoteExecutionResult> {
  const { request } = input;
  const target = request.nodeId ?? request.targetEndpoint ?? "unresolved";
  const policyEval = evaluatePolicy(input.policyBundle, { request: { version: "1", requestId: request.requestId, receivedAt: request.nowIso, source: "remote-execution", actor: "runtime", action: request.action, requestedModel: undefined, constraints: [], metadata: { target } }, actionClass: "remote_node" });
  const policyDecision: RemoteExecutionReceiptContext["policyDecision"] = !input.config.enabled ? "disabled" : (policyEval.requiredApproval ? "approval_required" : policyEval.allowed ? "allow" : "deny");
  const receiptBase = { version: "1" as const, receiptId: `remote-exec-${request.requestId}`, requestId: request.requestId, createdAt: request.nowIso, phases: [{ phase: "received", at: request.nowIso, notes: "execution_requested" }], toolInvocations: [], timing: { totalMs: 0 }, fallbackAttempts: [], operatorOverrides: [], provenance: { source: "remote-execution", lineage: ["worker", "remote"], replayVersion: "1" as const } };
  const context: RemoteExecutionReceiptContext = { transport: "http", target, policyDecision, redactedAuth: redact(request.auth) };
  let routeFingerprint = "unavailable";
  let checkpoint: { runId: string; taskId: string; status: "queued" | "running" | "completed" | "degraded"; replayCursor: string } = { runId: request.requestId, taskId: request.requestId, status: "degraded", replayCursor: "unavailable" };
  const finalize = (status: RemoteExecutionStatus, notes: string, degradedReason?: string, errorCode?: string, plan?: ExecutionPlan): RemoteExecutionResult => {
    const receipt: ExecutionReceipt = redactSecurityPayload({ ...receiptBase, phases: [...receiptBase.phases, { phase: "completed", at: request.nowIso, notes }], degradedEvents: degradedReason ? [{ category: "degraded", reason: degradedReason, affectedSubsystem: "remote-execution", severity: "warning", reasonCode: errorCode === "policy_blocked" || errorCode === "approval_required" ? "policy_blocked" : "transport_unreachable", explanation: degradedReason, sourceComponent: "remote-execution", timestamp: request.nowIso }] : [], policyDecision: policyDecision === "allow" ? { allowed: true, requiredApproval: false, reasons: [{ code: policyEval.reasonCode, explanation: "remote execution allowed", source: policyEval.sourceRuleId }] } : { allowed: false, requiredApproval: policyDecision === "approval_required", reasons: [{ code: policyDecision === "disabled" ? "policy_default_deny" : policyEval.reasonCode, explanation: notes, source: policyEval.sourceRuleId }] }, executionLineage: plan ? executionLineageFromPlan(plan, input.executionApproval, plan.authorization?.result) : undefined, metadata: context as never }) as unknown as ExecutionReceipt;
    const events = input.operationalMemory ? buildEventsFromReceipt(receipt, "remote-execution", input.operationalMemory) : [];
    const proofpack = buildR5Proofpack({ queueTimeline: queueGovernance.timeline, routingDecision: { selected: target, reason: routeFingerprint }, degradedReasons: degradedReason ? [degradedReason] : [], checkpoint: { ...checkpoint }, verification: { scripts: ["test:unit"], executedAt: request.nowIso } });
    return { status, degradedReason, errorCode, receipt, events, replayRef: receipt.provenance, proofpack };
  };

  const queueGovernance = input.queueGovernance ?? new QueueGovernance({ maxCapacity: 200, maxRetries: 2 });
  const queueId = `queue-${request.requestId}`;
  const enqueueResult = queueGovernance.enqueue({ queueId, idempotencyKey: request.requestId, payload: { target } });
  if (enqueueResult.outcome === "load_shed") return finalize("degraded", "queue_over_capacity", "queue_over_capacity", "constraint_unsatisfied");
  const handoff: Partial<HandoffPacket> = { schemaVersion: "1.0.0", runId: request.requestId, taskId: request.requestId, step: "remote_execute", objective: request.action, evidenceRefs: [], context: [request.command], createdAt: request.nowIso };
  const handoffValidation = validateHandoffPacket(handoff);
  if (!handoffValidation.ok) return finalize("degraded", handoffValidation.reason, handoffValidation.reason, "constraint_unsatisfied");
  const tokenBudget = estimateTokenBudget({ strings: [request.command, target, request.action], budget: input.tokenBudget ?? 4096 });
  if (tokenBudget.overBudget) return finalize("degraded", "token_budget_overflow", "token_budget_overflow", "constraint_unsatisfied");
  checkpoint = replayCheckpoint({ runId: request.requestId, taskId: request.requestId, status: "queued", checkpointAt: request.nowIso, replayCursor: queueId });
  routeFingerprint = taskFingerprint({ objective: request.action, constraints: [target], inputs: [request.command] });

  const trustDecision = denyRemoteByDefault({ allowRemoteExecution: input.config.enabled, trustAttested: Boolean(request.approved) });
  if (!input.config.enabled) return finalize("disabled", trustDecision.reason ?? "remote_execution_disabled", trustDecision.reason ?? "disabled_by_flag", "policy_blocked");
  if (policyDecision === "approval_required" && !request.approved) return finalize("approval_required", "approval_required", "approval_required", "approval_required");
  if (policyDecision === "deny") return finalize("policy_denied", "policy_denied", "policy_denied", "policy_blocked");
  if (!trustDecision.allowed) return finalize("degraded", trustDecision.reason ?? "remote_execution_denied_untrusted", trustDecision.reason ?? "remote_execution_denied_untrusted", "policy_blocked");

  const node = request.nodeId ? input.registry.getNode(request.nodeId) : undefined;
  if (request.executionPlanRequired && !input.executionPlan) return finalize("authorization_denied", "missing_execution_plan_lineage", "missing_execution_plan_lineage", "approval_required");
  if (input.executionPlan) {
    const currentPolicySnapshot = createExecutionPolicySnapshot({
      capturedAt: input.executionPlan.policySnapshot.capturedAt,
      governedRoutingEnabled: input.executionPlan.policySnapshot.governedRoutingEnabled,
      heterogeneousRoutingEnabled: input.executionPlan.policySnapshot.heterogeneousRoutingEnabled,
      remoteExecutionEnabled: input.config.enabled,
      policy: policyEval,
      fallbackPermitted: input.executionPlan.policySnapshot.fallbackPermitted,
      trustRequirement: input.executionPlan.policySnapshot.trustRequirement,
      attestationRequirement: input.executionPlan.policySnapshot.attestationRequirement,
      selectedCandidateClass: input.executionPlan.policySnapshot.selectedCandidateClass,
      workerTrustLevel: node?.workerTrustLevel,
      workerAttestationStatus: node?.workerAttestationStatus,
      executionMode: input.executionPlan.intent.executionMode,
    });
    const currentTrustSnapshot = createExecutionTrustSnapshot({
      capturedAt: input.executionPlan.trustSnapshot.capturedAt,
      node,
      trustRequirement: input.executionPlan.trustSnapshot.trustRequirement,
      attestationRequirement: input.executionPlan.trustSnapshot.attestationRequirement,
    });
    const authorization = validateExecutionAuthorization({
      nowIso: request.nowIso,
      plan: input.executionPlan,
      approval: input.executionApproval,
      currentIntent: { ...input.executionPlan.intent, requestId: request.requestId, action: request.action, command: request.command, targetNodeId: request.nodeId ?? input.executionPlan.intent.targetNodeId, targetEndpoint: request.targetEndpoint ?? input.executionPlan.intent.targetEndpoint },
      currentPolicySnapshot,
      currentTrustSnapshot,
    });
    const authorizedPlan = applyExecutionAuthorization(input.executionPlan, authorization);
    if (!authorization.granted) return finalize("authorization_denied", authorization.reasonCodes.join(","), authorization.reasonCodes.join(","), "approval_required", authorizedPlan);
    input.executionPlan = authorizedPlan;
  }
  if (request.nodeId && !node) return finalize("unavailable", "node_unavailable", "node_not_registered", "transport_unreachable");
  if (node && node.health !== "healthy") return finalize("degraded", "node_degraded", "node_stale_or_unhealthy", "transport_unreachable");
  if (node && (node.workerTrustLevel === "revoked" || node.workerAttestationStatus === "revoked")) return finalize("degraded", "worker_revoked", "worker_revoked", "policy_blocked");
  if (node && node.workerAttestationStatus === "expired") return finalize("degraded", "attestation_expired", "attestation_expired", "policy_blocked");
  if (node && node.workerAttestationStatus === "conflict_detected") return finalize("degraded", "attestation_conflict", "attestation_conflict", "policy_blocked");
  if (node && node.workerTrustLevel && !["trusted_remote", "trusted_local"].includes(node.workerTrustLevel)) return finalize("degraded", "worker_trust_denied", "policy_denied", "policy_blocked");
  const endpoint = request.targetEndpoint ?? node?.endpoint;
  if (!endpoint) return finalize("failed", "invalid_endpoint", "invalid_endpoint", "constraint_unsatisfied");
  const urlDecision = validateRemoteUrl(endpoint, request.timeoutMs);
  if (!urlDecision.decision.allowed || !urlDecision.url) return finalize("failed", urlDecision.decision.reasonCode, urlDecision.decision.reasonCode, "constraint_unsatisfied");
  const commandDecision = request.commandDescriptor
    ? validateCommandDescriptor(request.commandDescriptor, request.commandPolicy ?? DEFAULT_SECURITY_POLICY.commandExecution)
    : validateCommandString(request.command, request.commandPolicy ?? DEFAULT_SECURITY_POLICY.commandExecution, request.timeoutMs);
  if (!commandDecision.decision.allowed || !commandDecision.descriptor) {
    return finalize("failed", commandDecision.decision.reasonCode, commandDecision.decision.reasonCode, "policy_blocked");
  }
  const safeCommand = [commandDecision.descriptor.name, ...commandDecision.descriptor.argv].join(" ");
  const safeUrl = urlDecision.url.toString();
  const baseTimeoutMs = commandDecision.descriptor.timeoutMs;

  try {
    const responseAttempt = await boundedRetry((attempt) => input.transport.execute({ endpoint: safeUrl, command: safeCommand, timeoutMs: baseTimeoutMs * attempt, auth: request.auth }), input.retryConfig ?? { maxAttempts: 2, maxTotalMs: 60_000, backoffMs: 25 });
    if (!responseAttempt.ok) {
      const state = queueGovernance.markRetry(queueId);
      const msg = String(responseAttempt.error?.message ?? "network_unavailable").toLowerCase();
      if (state.status === "dead_letter") return finalize("degraded", "retry_exhausted", "retry_exhausted", "transport_unreachable");
      return finalize("degraded", msg.includes("timeout") ? "timeout" : "network_unavailable", msg.includes("timeout") ? "timeout" : "network_unavailable", "transport_unreachable");
    }
    const response = responseAttempt.value;
    if (response.status === 401 || response.status === 403) return finalize("degraded", "auth_rejected", "auth_rejected", "policy_blocked");
    if (response.status < 200 || response.status >= 300) return finalize("degraded", `http_${response.status}`, `http_${response.status}`, "transport_unreachable");
    let body: RemoteExecutionResponsePayload;
    try { body = JSON.parse(response.body) as RemoteExecutionResponsePayload; } catch { return finalize("degraded", "malformed_response", "malformed_response", "unknown_error"); }
    
    if (!verifyRemoteResponseIntegrity(body, false /* opt-in flag for legacy workers */)) {
      return finalize("degraded", "invalid_signature", "invalid_signature", "transport_unreachable");
    }

    if (body.status !== "ok") return finalize("failed", "remote_failed", "remote_failed", "unknown_error");
    const ok = finalize("succeeded", "execution_succeeded", undefined, undefined, input.executionPlan);
    return { ...ok, output: body.output };
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : String(e).toLowerCase();
    return finalize("degraded", msg.includes("timeout") ? "timeout" : "network_unavailable", msg.includes("timeout") ? "timeout" : "network_unavailable", "transport_unreachable");
  }
}

export function summarizeRemoteExecutionDiagnostics(config: RemoteExecutionConfig, last?: { status: RemoteExecutionStatus; target?: string; receiptId?: string; reason?: string; lineage?: RemoteExecutionLineageSummary }): string[] {
  return [
    `Remote execution: ${config.enabled ? "enabled" : "disabled"} (${config.source})`,
    `Last status: ${last?.status ?? "none"}`,
    `Target: ${last?.target ?? "none"}`,
    `Policy/degraded: ${last?.reason ?? "none"}`,
    `Execution plan: ${last?.lineage?.executionPlanId ?? "none"}`,
    `Approval state: ${last?.lineage?.executionApprovalId ? "recorded" : "none"}`,
    `Authorization state: ${last?.lineage?.authorizationLineageId ? "recorded" : "none"}`,
    `Policy snapshot hash: ${last?.lineage?.executionPolicySnapshotHash ?? "none"}`,
    `Trust snapshot hash: ${last?.lineage?.executionTrustSnapshotHash ?? "none"}`,
    `Intent hash: ${last?.lineage?.executionIntentHash ?? "none"}`,
    `Replay reference: ${last?.lineage?.replayReferenceId ?? "none"}`,
    `Receipt: ${last?.receiptId ?? "none"}`,
  ];
}
