import assert from 'node:assert/strict';
import { ExecutionProvider } from '../scripts/lib/execution-provider.mjs';

let calls = 0;
const provider = new ExecutionProvider({ submitInstruction: async () => ({ providerReference: `sim-${++calls}` }) });
const deal = {
  id: 'deal-demo', status: 'approved', notional: 100, limits: { notionalRemaining: 100 },
  approvals: ['risk', 'commercial', 'credit', 'operations'].map((role) => ({ role, status: 'approved' })),
  execution: { idempotencyKey: 'stable-key', instruction: { type: 'reserve_capacity', sku: 'h100-sxm' } },
};
const first = await provider.submit(deal, 'operator-1');
const second = await provider.submit(deal, 'operator-1');
assert.equal(first.response.providerReference, 'sim-1');
assert.equal(second.response.providerReference, 'sim-1');
assert.equal(calls, 1);
await assert.rejects(() => provider.submit({ ...deal, status: 'diligence' }, 'operator-1'), /Execution blocked/);
console.log('Execution provider tests passed');
