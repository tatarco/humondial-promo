function extractPromoErrCode(err) {
  if (err == null) return '';
  if (typeof err === 'object' && err.data && typeof err.data === 'object') {
    const er = err.data.error;
    if (typeof er === 'string') return er;
  }
  if (typeof err.message === 'string') return err.message;
  return '';
}

const MAP = {
  prediction_locked: 'המשחק ננעל — לא ניתן לעדכן ניחוש.',
  prediction_window_closed:
    'המשחק מחוץ לחלון הניחושים של הקמפיין כרגע.',
  match_not_found: 'משחק זה אינו זמין לניחוש.',
  forbidden: 'אין הרשאה לפעולה זו עכשיו.',
  unauthorized: 'ההתחברות פגה — התחברו שוב מהטלפון.',
  missing_params: 'בקשה לא מלאה — נסו שוב אחרי רענון.',
  campaign_mismatch: 'הגדרות ההפעלה לא תואמות — רעננו את הדף או התחברו שוב.',
};

export function mapPromoError(err) {
  const code = extractPromoErrCode(err)?.trim?.() || '';
  if (code && MAP[code]) return MAP[code];
  if (/^prediction_/.test(code) || /^promo_/i.test(code)) {
    return 'לא ניתן לשמור את הניחוש כרגע. נסו שוב או בחרו משחק אחר.';
  }
  if (typeof code === 'string' && /^[a-z][a-z0-9_]{2,}$/i.test(code)) {
    return 'אירעה שגיאה — נסו שוב בעוד רגע.';
  }
  return typeof err?.message === 'string' && err.message
    ? err.message
    : 'שגיאה — נסו שוב.';
}
