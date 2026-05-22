const LEGACY_TABIT_BRANCHES = [
  { name: 'קריות', orgId: '6911cae874d1ffc13623c168' },
  { name: 'תל חנן', orgId: '59256f1016c2e4220080a088' },
  { name: 'כפר יונה', orgId: '62528de3bc0d3754454176cb' },
  { name: 'כפר סבא', orgId: '579487ca92f8401e0000da20' },
  { name: 'באר שבע', orgId: '5dd66c7a775398f3a69022b8' },
  { name: 'יהוד', orgId: '6707d900ee6c51b72796fbf1' },
  { name: 'גבעת ברנר', orgId: '579e766f2063921e00fb4551' },
];

export function resolveBookingBranchesForCampaign(config) {
  const rows = Array.isArray(config?.branches) ? config.branches : [];
  const mapped = rows
    .map((b) => {
      if (!b || typeof b !== 'object') return null;
      const name = typeof b.name === 'string' ? b.name.trim() : '';
      const rawOrg =
        typeof b.tabit_org_id === 'string' ? b.tabit_org_id.trim() : '';
      if (!name || rawOrg.length < 8) return null;
      return { name, orgId: rawOrg };
    })
    .filter(Boolean);
  if (mapped.length > 0) return mapped;
  return LEGACY_TABIT_BRANCHES;
}
