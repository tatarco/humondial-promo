import { tierIconSrcFromCampaignTier } from '../lib/tierVisual.js';

export default function TierIcon({ tierLike, sizePx = 40, className = '', alt }) {
  const label =
    tierLike && typeof tierLike === 'object'
      ? (tierLike.label_he || tierLike.label || '').trim()
      : '';
  return (
    <img
      src={tierIconSrcFromCampaignTier(tierLike)}
      width={sizePx}
      height={sizePx}
      alt={alt || label || 'דרגה'}
      className={`object-contain shrink-0 ${className}`.trim()}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
