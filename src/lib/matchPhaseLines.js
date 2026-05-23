/** Build lines from Base44 listMatches (phase_label_he, pwa_*) with safe fallbacks. */

export function matchPhasePrimary(match) {
  const p =
    typeof match?.phase_label_he === 'string' && match.phase_label_he.trim().length > 0
      ? match.phase_label_he.trim()
      : '';
  return p || match?.stage || '';
}

export function matchPhaseSecondary(match, { isLive, isFinal }) {
  if (isFinal) return null;
  if (isLive) {
    const t =
      typeof match?.pwa_live_scores_explanation_he === 'string'
        ? match.pwa_live_scores_explanation_he.trim()
        : '';
    return t || null;
  }
  const s =
    typeof match?.pwa_scheduling_line_he === 'string' ? match.pwa_scheduling_line_he.trim() : '';
  return s || null;
}
