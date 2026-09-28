import { readFile } from 'node:fs/promises';
import { parseCsv } from './lib/csv.mjs';

const path = process.argv[2];
if (!path) {
  console.error('Usage: node scripts/validate-private-book.mjs <csv-file>');
  process.exit(1);
}

const numberFields = ['gpu_count', 'network_gbps', 'minimum_network_gbps', 'sla_percent', 'required_sla_percent', 'term_months', 'usd_hr', 'maximum_usd_hr'];
const requiredByType = {
  supplier_quote: ['sku', 'gpu_count', 'region', 'cluster_topology', 'network_gbps', 'sla_percent', 'available_from', 'term_months', 'usd_hr', 'confidence', 'source_classification', 'source_reference'],
  buyer_mandate: ['sku', 'gpu_count', 'region', 'minimum_network_gbps', 'required_sla_percent', 'available_from', 'term_months', 'maximum_usd_hr', 'credit_grade', 'confidence', 'source_classification', 'source_reference'],
};

const rows = parseCsv(await readFile(path, 'utf8'));
const errors = [];
for (const [index, row] of rows.entries()) {
  const line = index + 2;
  const required = requiredByType[row.record_type];
  if (!required) {
    errors.push(`row ${line}: record_type must be supplier_quote or buyer_mandate`);
    continue;
  }
  for (const field of required) if (!row[field]) errors.push(`row ${line}: missing ${field}`);
  for (const field of numberFields) if (row[field] && !Number.isFinite(Number(row[field]))) errors.push(`row ${line}: ${field} must be numeric`);
  if (row.source_classification && !['public', 'permissioned_private', 'synthetic'].includes(row.source_classification)) errors.push(`row ${line}: invalid source_classification`);
  if (row.source_classification === 'public') errors.push(`row ${line}: public observations cannot enter the private-book import path`);
}

if (errors.length) {
  console.error(`Validation failed with ${errors.length} issue(s):\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}
console.log(`Validated ${rows.length} private-book record(s). No record is promoted to executable status by this validation.`);
