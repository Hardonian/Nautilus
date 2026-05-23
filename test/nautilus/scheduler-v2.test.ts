import { describe, expect, it } from 'vitest';
import { createDeviceRegistry } from '../../src/lib/control-plane/device-registry';
import { scheduleDeterministically } from '../../src/lib/control-plane/scheduler';

const baseRequest = {
  version: '1', requestId: 'r', receivedAt: '2026-01-01T00:00:00.000Z', source: 't', actor: 'a', action: 'provider:select', requestedModel: 'm', constraints: [], metadata: { estimatedInputTokens: '1024', estimatedOutputTokens: '1024', vramRequiredMb: '8192' },
};

import type { NodeDescriptor } from '../../src/lib/control-plane/types';

function node(nodeId: string, vram: number, context: number, recentLatencyMs = 50): NodeDescriptor {
  return {
    version: '1', nodeId, role: 'local', transport: 'unix', endpoint: 'x', trustClass: 'trusted', registeredAt: '2026-01-01T00:00:00.000Z', lastHeartbeatAt: '2026-01-01T00:00:00.000Z', health: 'healthy', metadata: { recentLatencyMs, queuePressure: 0, estimatedCost: 0 }, capabilities: { version:'1', capturedAt:'2026-01-01T00:00:00.000Z', source:'t', runtimeBackend:'x', executionMode:'local', gpus:[{vendor:'n',model:'g',vramMb:vram,count:1}], models:[{modelId:'m',maxContextTokens:context,flags:{streaming:false,tools:false,batch:false,multimodal:false,quantization:false},inferenceConstraints:[],executionRestrictions:[]}], policyTags:[], reliabilityTags:[], runtimeTags:[], transportRequirements:[] },
  };
}

describe('scheduler v2', () => {
  it('prefers compatible VRAM candidate and rejects insufficient VRAM', () => {
    const registry = createDeviceRegistry();
    registry.register(node('n1', 4096, 8192));
    registry.register(node('n2', 16384, 8192));
    const result = scheduleDeterministically({ request: baseRequest, classification: { taskKind:'chat', riskLevel:'low', latencySensitivity:'standard', contextRequirement:'small', requiresTools:false, requiresStreaming:false, batchSuitable:false, remoteExecutionEligible:true, approvalRequirementHint:'none', providerConstraints:[] }, registry, policy: { decision:'allow' as any, allowed: true, requiredApproval: false, reasonCode:'policy_default_allow', sourceRuleId:'r', matchedRuleIds:['r'] }, degradedStates: [] });
    expect(result.decision.selected?.nodeId).toBe('n2');
    expect(result.decision.rejected.some((r) => r.rejectionReasons.some((rr) => rr.startsWith('insufficient_vram')))).toBe(true);
  });

  it('rejects context overflow and remains deterministic on tie-break', () => {
    const registry = createDeviceRegistry();
    registry.register(node('a-node', 16384, 1000));
    registry.register(node('b-node', 16384, 1000));
    const result = scheduleDeterministically({ request: baseRequest, classification: { taskKind:'chat', riskLevel:'low', latencySensitivity:'standard', contextRequirement:'small', requiresTools:false, requiresStreaming:false, batchSuitable:false, remoteExecutionEligible:true, approvalRequirementHint:'none', providerConstraints:[] }, registry, policy: { decision:'allow' as any, allowed: true, requiredApproval: false, reasonCode:'policy_default_allow', sourceRuleId:'r', matchedRuleIds:['r'] }, degradedStates: [] });
    expect(result.decision.selected).toBeUndefined();
    expect(result.decision.rejected.every((r) => r.rejectionReasons.some((rr) => rr.startsWith('context_overflow')))).toBe(true);
  });
});
