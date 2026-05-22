import { describe, expect, it } from 'vitest';
import { buildOperatorConsoleSurface } from '../../src/lib/core/operator-console';

describe('operator console surface', () => {
  it('renders timeline and routing explanation from receipt-backed inputs', () => {
    const out = buildOperatorConsoleSurface({
      executionId: 'e1',
      topology: { nodes: ['n1'] },
      timeline: { events: [{ at:'t', status:'degraded', summary:'runtime unavailable' }] },
      routing: { selected: 'n1/m1', reasonCodes: ['scheduled'] },
      degraded: ['runtime_unavailable'],
      health: { state: 'degraded', details: ['runtime unavailable'] },
      outcome: { status: 'failed', summary: 'x' },
      memoryProvenance: [],
    });
    expect(out.timeline.state).toBe('ready');
    expect(out.routeExplanation.details).toContain('scheduled');
    expect(out.recovery.state).toBe('actionable');
  });

  it('marks unavailable telemetry explicitly', () => {
    const out = buildOperatorConsoleSurface({
      executionId: 'e2',
      topology: { nodes: [], unavailableReason: 'telemetry_stale' },
      timeline: { events: [], unavailableReason: 'receipt_missing' },
      degraded: [],
      health: { state: 'unavailable', details: ['stale telemetry'] },
      outcome: { status: 'denied', summary: 'no data' },
      memoryProvenance: [],
    });
    expect(out.timeline.state).toBe('unavailable');
    expect(out.topology.state).toBe('unavailable');
  });
});
