import assert from 'node:assert/strict';
import { nonFungibilityRisk, scoreCompatibility } from '../scripts/lib/matching.mjs';

const supply = { sku: 'h100-sxm', gpu_count: 256, region: 'us-east', network_gbps: 400, sla_percent: 99.9, term_months: 12, cancellation_rights: 'none', credit_grade: 'A-' };
const compatibleBuyer = { sku: 'h100-sxm', gpu_count: 192, regions: ['us-east'], minimum_network_gbps: 400, required_sla_percent: 99.9, term_months: 6 };
const incompatibleBuyer = { sku: 'b200', gpu_count: 512, regions: ['eu-west'], minimum_network_gbps: 800, required_sla_percent: 99.99, term_months: 18 };

assert.equal(scoreCompatibility(supply, compatibleBuyer).score, 100);
assert.equal(scoreCompatibility(supply, compatibleBuyer).qualifies, true);
assert.equal(scoreCompatibility(supply, incompatibleBuyer).qualifies, false);
assert.equal(nonFungibilityRisk(supply, incompatibleBuyer).classification, 'high');
console.log('Matching tests passed');
