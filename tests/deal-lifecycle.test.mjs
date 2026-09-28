import assert from 'node:assert/strict';
import { readyForExecution, transitionDeal } from '../scripts/lib/deal-lifecycle.mjs';

let deal = { status: 'draft', audit: [] };
deal = transitionDeal(deal, 'screening', 'researcher');
deal = transitionDeal(deal, 'diligence', 'researcher');
assert.equal(deal.audit.length, 2);
assert.throws(() => transitionDeal(deal, 'active', 'operator'), /Cannot transition/);

const complete = {
  status: 'approved', notional: 100, limits: { notionalRemaining: 100 }, execution: { idempotencyKey: 'demo-key' },
  approvals: ['risk', 'commercial', 'credit', 'operations'].map((role) => ({ role, status: 'approved' })),
};
assert.deepEqual(readyForExecution(complete), { ready: true, missing: [] });
assert.equal(readyForExecution({ ...complete, execution: {} }).missing.includes('idempotency_key'), true);
console.log('Deal lifecycle tests passed');
