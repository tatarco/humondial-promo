const CONTEXT_GRADIENT = {
  tier_upgrade:       ['#7c1313', '#f4c15d'],
  venue_visit:        ['#7c1313', '#d63a36'],
  delivery:           ['#7c1313', '#d63a36'],
  correct_prediction: ['#0d2a50', '#1a6bbf'],
  bullseye:           ['#0d2a50', '#1a6bbf'],
  prediction_share:   ['#0d2a50', '#1a6bbf'],
  rank_share:         ['#1a1a2e', '#f4c15d'],
};

const CONTEXT_EMOJI = {
  tier_upgrade:       '🏆',
  venue_visit:        '🏟️',
  delivery:           '🛵',
  correct_prediction: '✅',
  bullseye:           '🎯',
  prediction_share:   '⚽',
  rank_share:         '📊',
};

export function fillTemplatePlaceholders(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

export async function drawShareCard(context, data, template) {
  const W = 540, H = 960;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Background gradient
  const [c1, c2] = CONTEXT_GRADIENT[context] || ['#1a1a2e', '#333'];
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Subtle overlay
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 0, W, H);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Top bar — brand name
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('🌍 הומונדיאל', W - 28, 60);

  // Context tag
  ctx.font = '18px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillText(context.replace(/_/g, ' '), W - 28, 90);

  // Big emoji
  ctx.font = '96px Arial';
  ctx.textAlign = 'center';
  ctx.direction = 'ltr';
  ctx.fillText(CONTEXT_EMOJI[context] || '📤', W / 2, 260);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  // Headline
  const headline = fillTemplatePlaceholders(template.headline_he || '', data);
  ctx.font = 'bold 48px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(headline, W - 28, 380);

  // Subline
  const subline = fillTemplatePlaceholders(template.subline_he || '', data);
  ctx.font = '32px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(subline, W - 28, 440);

  // CTA
  const cta = fillTemplatePlaceholders(template.cta_he || '', data);
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#f4c15d';
  ctx.fillText(cta, W - 28, 520);

  // Hashtags
  ctx.font = '22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(template.hashtags || '', W - 28, 580);

  // Footer divider
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, H - 120);
  ctx.lineTo(W - 28, H - 120);
  ctx.stroke();

  // Footer: rank + points
  if (data.rank) {
    ctx.font = 'bold 30px Arial';
    ctx.fillStyle = '#f4c15d';
    ctx.fillText(`#${data.rank} בדירוג · ${data.points || 0} נקודות`, W - 28, H - 76);
  }

  // Footer: Yomange branding
  ctx.font = '22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('יומנגס — הומונדיאל 2026', W - 28, H - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}
