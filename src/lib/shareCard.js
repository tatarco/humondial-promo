const CONTEXT_GRADIENT = {
  tier_upgrade:       ['#7c1313', '#f4c15d'],
  venue_visit:        ['#7c1313', '#d63a36'],
  delivery:           ['#7c1313', '#d63a36'],
  correct_prediction: ['#0a1628', '#162040'],
  bullseye:           ['#0a1628', '#162040'],
  prediction_share:   ['#0a1628', '#162040'],
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

const MATCH_CONTEXTS = new Set(['prediction_share', 'correct_prediction', 'bullseye']);

export function fillTemplatePlaceholders(template, data) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : match;
  });
}

function fitText(ctx, text, maxW, spec) {
  const m = spec.match(/^(.+?)(\d+)(px .+)$/);
  if (!m) { ctx.font = spec; return; }
  const [, pre, , post] = m;
  let sz = parseInt(m[2]);
  ctx.font = pre + sz + post;
  while (sz > 10 && ctx.measureText(text).width > maxW) {
    sz -= 2;
    ctx.font = pre + sz + post;
  }
}

function drawBackground(ctx, c1, c2, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(0, 0, W, H);
}

function drawBrand(ctx, subLabel, W) {
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('🌍 הומונדיאל', W - 30, 66);
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(subLabel, W - 30, 96);
  ctx.restore();
}

function drawFooter(ctx, data, W, H) {
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, H - 132);
  ctx.lineTo(W - 30, H - 132);
  ctx.stroke();
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  if (data.rank) {
    ctx.font = 'bold 27px Arial';
    ctx.fillStyle = '#f4c15d';
    ctx.fillText(`#${data.rank} בדירוג · ${data.points || 0} נקודות`, W - 30, H - 78);
  }
  ctx.font = '21px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.fillText('יומנגס — הומונדיאל 2026', W - 30, H - 42);
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawMatchCard(ctx, data, template, W, H, subLabel) {
  drawBackground(ctx, '#0a1628', '#162040', W, H);
  drawBrand(ctx, subLabel, W);

  const cX = 30, cW = W - 60, cH = 132, r = 21;

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = '24px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText('אני מנחש…', W - 30, 150);

  const homeScore = data.home_score ?? '';
  const awayScore = data.away_score ?? '';
  const homeFlag  = data.home_flag  ?? '';
  const awayFlag  = data.away_flag  ?? '';
  const homeName  = data.home ?? '';
  const awayName  = data.away ?? '';

  // Home card
  const homeTop = 177;
  roundRect(ctx, cX, homeTop, cW, cH, r, 'rgba(255,255,255,0.07)');
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '60px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(homeFlag, cX + 24, homeTop + 90);
  fitText(ctx, homeName, cW - 180, 'bold 36px Arial');
  ctx.fillStyle = '#fff';
  ctx.fillText(homeName, cX + 105, homeTop + 75);
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('בית', cX + 105, homeTop + 107);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = 'bold 51px Arial';
  ctx.fillStyle = '#f4c15d';
  ctx.fillText(String(homeScore), cX + cW - 27, homeTop + 87);

  // VS separator
  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.font = 'bold 20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('VS', W / 2, homeTop + cH + 30);

  // Away card
  const awayTop = homeTop + cH + 57;
  roundRect(ctx, cX, awayTop, cW, cH, r, 'rgba(255,255,255,0.07)');
  ctx.direction = 'ltr';
  ctx.textAlign = 'left';
  ctx.font = '60px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(awayFlag, cX + 24, awayTop + 90);
  fitText(ctx, awayName, cW - 180, 'bold 36px Arial');
  ctx.fillStyle = '#fff';
  ctx.fillText(awayName, cX + 105, awayTop + 75);
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText('חוץ', cX + 105, awayTop + 107);
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = 'bold 51px Arial';
  ctx.fillStyle = '#f4c15d';
  ctx.fillText(String(awayScore), cX + cW - 27, awayTop + 87);

  const ctaY = awayTop + cH + 50;
  ctx.direction = 'rtl';
  ctx.textAlign = 'right';
  ctx.font = '23px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(fillTemplatePlaceholders(template.cta_he || 'הצטרפו לקמפיין!', data), W - 30, ctaY);
  ctx.font = '20px Arial';
  ctx.fillStyle = '#f4c15d';
  ctx.fillText(template.hashtags || '', W - 30, ctaY + 36);

  drawFooter(ctx, data, W, H);
}

function drawGenericCard(ctx, context, data, template, W, H) {
  const [c1, c2] = CONTEXT_GRADIENT[context] || ['#1a1a2e', '#333'];
  drawBackground(ctx, c1, c2, W, H);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillText('🌍 הומונדיאל', W - 30, 66);
  ctx.font = '20px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fillText(context.replace(/_/g, ' '), W - 30, 96);

  ctx.direction = 'ltr';
  ctx.textAlign = 'center';
  ctx.font = '96px Arial';
  ctx.fillStyle = '#fff';
  ctx.fillText(CONTEXT_EMOJI[context] || '📤', W / 2, 280);

  ctx.direction = 'rtl';
  ctx.textAlign = 'right';

  const headline = fillTemplatePlaceholders(template.headline_he || '', data);
  fitText(ctx, headline, W - 56, 'bold 48px Arial');
  ctx.fillStyle = '#ffffff';
  ctx.fillText(headline, W - 28, 400);

  const subline = fillTemplatePlaceholders(template.subline_he || '', data);
  ctx.font = '32px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillText(subline, W - 28, 460);

  const cta = fillTemplatePlaceholders(template.cta_he || '', data);
  ctx.font = 'bold 28px Arial';
  ctx.fillStyle = '#f4c15d';
  ctx.fillText(cta, W - 28, 540);

  ctx.font = '22px Arial';
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fillText(template.hashtags || '', W - 28, 600);

  drawFooter(ctx, data, W, H);
}

export async function drawShareCard(context, data, template) {
  const W = 540, H = 960;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  if (MATCH_CONTEXTS.has(context)) {
    const subLabel = context === 'bullseye' ? '🎯 בינגו!' : 'הניחוש שלי';
    drawMatchCard(ctx, data, template, W, H, subLabel);
  } else {
    drawGenericCard(ctx, context, data, template, W, H);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}
