import { readyForExecution } from './deal-lifecycle.mjs';

// Provider adapters implement this boundary. The demo adapter intentionally has no network access.
export class ExecutionProvider {
  constructor({ submitInstruction }) {
    this.submitInstruction = submitInstruction;
    this.idempotentResponses = new Map();
  }

  async submit(deal, actor) {
    const readiness = readyForExecution(deal);
    if (!readiness.ready) throw new Error(`Execution blocked: ${readiness.missing.join(', ')}`);
    const key = deal.execution.idempotencyKey;
    if (this.idempotentResponses.has(key)) return this.idempotentResponses.get(key);
    const request = {
      idempotencyKey: key,
      dealId: deal.id,
      actor,
      instruction: deal.execution.instruction,
      requestedAt: new Date().toISOString(),
    };
    const response = await this.submitInstruction(request);
    const event = { eventType: 'execution_submitted', providerReference: response.providerReference, payload: request };
    const result = { response, event };
    this.idempotentResponses.set(key, result);
    return result;
  }
}
