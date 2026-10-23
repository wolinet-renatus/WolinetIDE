import type { CacheAlignment, CapabilityEntry, CapabilityHarness, CapabilityInventory } from './capabilities-panel';

const harnesses: CapabilityHarness[] = [
  { id: 'wolinet', name: 'Wolinet AI' },
];

const entries: CapabilityEntry[] = [
  { harness: 'wolinet', kind: 'slash command', name: '/review', state: 'native', source: 'Wolinet AI command catalog', command: null },
  { harness: 'wolinet', kind: 'mcp server', name: 'Documentation Index', state: 'discovered', source: 'Project configuration', command: 'node' },
  { harness: 'wolinet', kind: 'skill', name: 'Project guidelines', state: 'discovered', source: 'Project skills directory', command: null },
];

const inventory: CapabilityInventory = {
  harnesses,
  entries,
  matrix: Array.from(new Map(entries.map(entry => [entry.kind + '\u0000' + entry.name, { kind: entry.kind, name: entry.name }])).values())
    .map(row => ({
      ...row,
      states: harnesses.map(harness => ({
        harness: harness.id,
        state: entries.find(entry => entry.harness === harness.id && entry.kind === row.kind && entry.name === row.name)?.state ?? 'missing',
      })),
    })),
  warnings: [],
};

const cache: CacheAlignment = {
  taskProvider: null,
  harnesses: [
    { id: 'wolinet', name: 'Wolinet AI', instructionDelivery: 'cachedSystemPrompt', state: 'supported', cacheTokens: 'observed', cacheReadTokens: 54000, cacheCreationTokens: 1800, cacheTokenSource: 'Sample observed record' },
  ],
};

/** Sample-only preview response. No local files, harnesses, or cache data are read here. */
export function previewCapabilities(command: string): CapabilityInventory | CacheAlignment {
  if (command === 'capabilities_inventory') return structuredClone(inventory);
  if (command === 'cache_alignment') return structuredClone(cache);
  throw new Error('Unknown capabilities preview command.');
}

