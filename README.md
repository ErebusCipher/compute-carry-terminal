# Compute Carry Terminal

Private research terminal for compute-capacity price discovery and structured-deal screening.

## Public data ingestion

`npm run ingest:public` fetches the public PowerGPU Cloud GPU Price Index, normalizes H100 SXM, H200, B200, and L40S records, and writes:

- `dist/data/compute-index.json` - current source-attributed snapshot
- `dist/data/price-history.json` - one daily median observation per tracked SKU

The pipeline intentionally keeps public list-price references separate from private supplier quotes, buyer mandates, and executed contract terms. Public pricing is not treated as executable capacity or a valuation of any deal.

To run it on a schedule later, invoke `npm run ingest:public` from a trusted runner with outbound access and commit/deploy the generated `dist/data` files. Add new adapters only where the source terms permit automated collection and attribution.

## Private-book readiness

The terminal includes a synthetic supplier/buyer fixture at `dist/data/sandbox-book.json`. It is deliberately non-commercial and contains no real capacity, quotes, or mandates.

Use `schemas/private-book.schema.json` as the validation contract before importing any future permissioned record. CSV templates are in `dist/templates/`. Public references, permissioned private records, and synthetic fixtures must retain separate `source_classification` values.

## Integration-ready control plane

The repository now also includes the external-engineering contracts needed to connect an internal book without redesigning the product:

- `schemas/private-book.sql` defines canonical counterparties, quotes, mandates, deals, role-bound approvals, and immutable execution-event records.
- `schemas/openapi.yaml` defines authenticated import, screening, approval, and idempotent execution endpoints.
- `scripts/lib/deal-lifecycle.mjs` enforces legal lifecycle transitions and verifies the four required approvals plus remaining limits before execution.

The terminal does not include credentials, counterparty data, or execution-provider integrations. Those should be implemented behind a secrets manager, SSO/RBAC, row-level data permissions, a trusted job runner, and an execution-provider adapter that writes an idempotent event before transmitting any order or contract instruction.
