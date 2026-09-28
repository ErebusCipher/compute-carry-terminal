export function scoreCompatibility(supply, buyer) {
  let score = 0;
  const flags = [];
  if (supply.sku === buyer.sku) score += 35; else flags.push('SKU mismatch');
  if ((buyer.regions ?? []).includes(supply.region)) score += 15; else flags.push('Region mismatch');
  if (Number(supply.gpu_count) >= Number(buyer.gpu_count)) score += 10; else flags.push('Insufficient capacity');
  if (Number(supply.network_gbps) >= Number(buyer.minimum_network_gbps)) score += 15; else flags.push('Network below requirement');
  if (Number(supply.sla_percent) >= Number(buyer.required_sla_percent)) score += 15; else flags.push('SLA below requirement');
  if (Number(supply.term_months) >= Number(buyer.term_months)) score += 10; else flags.push('Term mismatch');
  return { score, flags, qualifies: score >= 60 };
}

export function nonFungibilityRisk(supply, buyer) {
  const match = scoreCompatibility(supply, buyer);
  const hardFlags = match.flags.length;
  const score = Math.min(100, hardFlags * 18 + (supply.cancellation_rights === 'none' ? 16 : 4) + (supply.credit_grade === 'BBB+' ? 8 : 2));
  return {
    score,
    classification: score >= 55 ? 'high' : score >= 30 ? 'medium' : 'low',
    flags: match.flags,
  };
}
