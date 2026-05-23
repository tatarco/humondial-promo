import { useConfig } from '../contexts/ConfigContext.jsx';
import { mergePlayerTierWithCatalog } from '../lib/tierCampaignMerge.js';
import { tierIconSrcFromCampaignTier } from '../lib/tierVisual.js';

export default function TierIcon({ tierLike, sizePx = 40, className = '', alt }) {
  const config = useConfig();
  const tiers = Array.isArray(config?.tiers) ? config.tiers : [];
  const merged =
    tierLike && typeof tierLike === 'object'
      ? mergePlayerTierWithCatalog(tierLike, tiers)
      : tierLike;
  let src = '';
  try {
    src = tierIconSrcFromCampaignTier(merged);
  } catch {
    src = tierIconSrcFromCampaignTier({
      ...(typeof tierLike === 'object' && tierLike ? tierLike : {}),
      hero_slot: 1,
      chip_variant: 'copper',
    });
  }
  const label =
    tierLike && typeof tierLike === 'object'
      ? (merged?.label_he || tierLike.label_he || tierLike.label || '').trim()
      : (merged?.label_he || '').trim();
  const shellSz = `${sizePx}px`;
  return (
    <span
      className={`hm-tier-hero-shell inline-flex items-center justify-center shrink-0 overflow-hidden ${className}`.trim()}
      style={{ width: shellSz, height: shellSz }}
    >
      <img
        src={src}
        width={sizePx}
        height={sizePx}
        alt={alt || label || 'דרגה'}
        className="hm-tier-hero-img max-h-full max-w-full object-contain"
        loading="lazy"
        decoding="async"
        draggable={false}
      />
    </span>
  );
}
