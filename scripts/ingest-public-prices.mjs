import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = join(root, 'dist', 'data');
const outputFile = join(outputDirectory, 'compute-index.json');
const historyFile = join(outputDirectory, 'price-history.json');
const sourceUrl = 'https://powergpu.ai/gpu-price-index.json';
const trackedSkus = ['h100-sxm', 'h200', 'b200', 'l40s'];

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function normalize(record) {
  const prices = record.powergpu_usd_hr ?? {};
  const observations = (record.competitor_list_prices ?? []).map((quote) => ({
    provider: quote.provider,
    usd_hr: number(quote.usd_hr),
    note: quote.note ?? null,
    checked: quote.checked ?? null,
    region: null,
    topology: null,
    sla: null,
    normalization_status: 'partial',
  }));
  const qualityScore = Math.min(100, 45 + Math.min(observations.length, 5) * 8 + (record.market_median_usd_hr ? 10 : 0));
  return {
    sku: record.slug,
    name: record.name,
    vram_gb: record.vram_gb ?? null,
    architecture: record.architecture ?? null,
    tier: record.tier ?? null,
    market_median_usd_hr: number(record.market_median_usd_hr),
    provider_reference_usd_hr: {
      on_demand: number(prices.on_demand),
      interruptible: number(prices.interruptible),
      reserved: number(prices.reserved),
    },
    market_90d: record.median_90d ?? null,
    provider_observations: observations,
    availability_signal: record.gpus_available ?? null,
    source_page: record.url ?? null,
    data_quality: {
      score: qualityScore,
      classification: qualityScore >= 80 ? 'strong public reference' : qualityScore >= 60 ? 'partial public reference' : 'weak public reference',
      missing_fields: ['region', 'cluster topology', 'network', 'SLA', 'deployment date'],
      executable: false,
    },
  };
}

async function main() {
  const response = await fetch(sourceUrl, {
    headers: { Accept: 'application/json', 'User-Agent': 'ComputeCarryTerminal/0.1' },
  });
  if (!response.ok) throw new Error(`Public index request failed: ${response.status} ${response.statusText}`);

  const source = await response.json();
  const records = trackedSkus
    .map((sku) => source.data?.find((record) => record.slug === sku))
    .filter(Boolean)
    .map(normalize);

  if (records.length !== trackedSkus.length) {
    throw new Error(`Incomplete source response: expected ${trackedSkus.length} tracked SKUs, received ${records.length}`);
  }

  const fetchedAt = new Date().toISOString();
  const snapshot = {
    generated_at: fetchedAt,
    source: {
      name: 'PowerGPU Cloud GPU Price Index',
      url: sourceUrl,
      snapshot_date: source.snapshot_date ?? null,
      currency: source.currency ?? 'USD',
      unit: source.unit ?? 'per GPU-hour',
      methodology: source.price_rule ?? null,
      license: source.license ?? 'Verify source license before external redistribution.',
      attribution: 'Source: PowerGPU Cloud GPU Price Index. Provider observations are public list-price references, not executable quotes.',
    },
    records,
  };

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(snapshot, null, 2)}\n`);

  const history = await readJson(historyFile, { observations: [] });
  const date = source.snapshot_date ?? fetchedAt.slice(0, 10);
  const observation = {
    date,
    captured_at: fetchedAt,
    prices: Object.fromEntries(records.map((record) => [record.sku, record.market_median_usd_hr])),
  };
  const observations = [...(history.observations ?? []).filter((entry) => entry.date !== date), observation]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-365);
  await writeFile(historyFile, `${JSON.stringify({ source: snapshot.source, observations }, null, 2)}\n`);

  console.log(`Wrote ${records.length} normalized GPU records to ${outputFile}`);
  console.log(`Updated ${historyFile} with ${observations.length} daily observations`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
