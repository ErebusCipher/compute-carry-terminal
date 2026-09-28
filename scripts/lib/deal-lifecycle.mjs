const transitions = {
  draft: ['screening', 'rejected'],
  screening: ['diligence', 'rejected'],
  diligence: ['approval_pending', 'rejected'],
  approval_pending: ['approved', 'rejected'],
  approved: ['executing', 'paused'],
  executing: ['active', 'paused'],
  active: ['paused', 'closed'],
  paused: ['active', 'closed'],
  rejected: [],
  closed: [],
};

export function transitionDeal(deal, nextStatus, actor, note = '') {
  if (!transitions[deal.status]?.includes(nextStatus)) throw new Error(`Cannot transition ${deal.status} to ${nextStatus}`);
  const event = {
    sequence: (deal.audit?.length ?? 0) + 1,
    at: new Date().toISOString(),
    actor,
    from: deal.status,
    to: nextStatus,
    note,
  };
  return { ...deal, status: nextStatus, audit: [...(deal.audit ?? []), event] };
}

export function readyForExecution(deal) {
  const required = ['risk', 'commercial', 'credit', 'operations'];
  const approvals = Object.fromEntries((deal.approvals ?? []).map((approval) => [approval.role, approval.status]));
  const missing = required.filter((role) => approvals[role] !== 'approved');
  if (deal.status !== 'approved') missing.unshift('deal_status');
  if (deal.limits?.notionalRemaining == null || deal.limits.notionalRemaining < deal.notional) missing.push('notional_limit');
  if (!deal.execution?.idempotencyKey) missing.push('idempotency_key');
  return { ready: missing.length === 0, missing };
}
