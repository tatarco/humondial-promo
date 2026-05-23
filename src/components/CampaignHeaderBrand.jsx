import { useConfig } from '../contexts/ConfigContext.jsx';
import {
  resolvedBrandHeaderLogoUrl,
  formatBrandSubtitleDisplay,
} from '../lib/campaignBrand.js';

export default function CampaignHeaderBrand({ maxLogoHeight = 28, titleSizePx = 22 }) {
  const config = useConfig();
  if (!config) {
    return (
      <div className="flex flex-col items-center leading-none gap-1">
        <h1
          className="font-black m-0"
          style={{
            fontSize: titleSizePx,
            color: '#fff',
            textShadow: '0 0 16px rgba(214,58,54,0.4)',
            letterSpacing: 3,
          }}
        >
          HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
        </h1>
      </div>
    );
  }
  const img = resolvedBrandHeaderLogoUrl(config);
  const subRaw =
    typeof config?.brand_header_subtitle === 'string' ? config.brand_header_subtitle.trim() : '';

  const subDisplay = formatBrandSubtitleDisplay(subRaw);

  const alt =
    typeof config?.brand_header_logo_alt === 'string' && config.brand_header_logo_alt.trim()
      ? config.brand_header_logo_alt.trim()
      : 'HUMONDIAL';

  return (
    <div className="flex flex-col items-center leading-none gap-1">
      {img ? (
        <img
          src={img}
          alt={alt}
          className="object-contain select-none w-auto"
          style={{ maxHeight: maxLogoHeight }}
          draggable={false}
          decoding="async"
          loading="eager"
        />
      ) : (
        <h1
          className="font-black m-0"
          style={{
            fontSize: titleSizePx,
            color: '#fff',
            textShadow: '0 0 16px rgba(214,58,54,0.4)',
            letterSpacing: 3,
          }}
        >
          HUMON<span style={{ color: 'var(--red)' }}>DIAL</span>
        </h1>
      )}
      {subDisplay ? (
        <span
          dir="ltr"
          className="font-black"
          style={{
            fontSize: subDisplay.length > 14 ? 11 : subRaw.length <= 4 ? 14 : 12,
            color: 'var(--gold)',
            letterSpacing: 4,
            marginTop: 2,
          }}
        >
          {subDisplay}
        </span>
      ) : null}
    </div>
  );
}
