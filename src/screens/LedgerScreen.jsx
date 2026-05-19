import { useState, useEffect, useCallback, useMemo } from 'react';
import { callFn } from '../lib/api.js';

const REASON_MAP = {
  prediction_participation: { emoji: '⚽', label: 'ניחוש' },
  delivery:                 { emoji: '🛵', label: 'משלוח' },
  table_booking:            { emoji: '🍽️', label: 'הזמנת שולחן' },
  venue_visit:              { emoji: '🏟️', label: 'ביקור' },
  achievement:              { emoji: '🏅', label: 'הישג' },
};

const groupByDate = (rows) => {
  const groups = {};
  const today = new Date().toDateString();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toDateString();
  for (const row of rows) {
    const d = new Date(row.created_at);
    const key = d.toDateString();
    const label = key === today ? 'היום' : key === yesterday ? 'אתמול' : d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(row);
  }
  return groups;
};

function formatTime(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function LedgerScreen({ token, campaignId, onBack }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await callFn('getPlayerLedger', { token, campaign_id: campaignId });
      setData(result);
    } catch (e) {
      setError(e.message || 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [token, campaignId]);

  useEffect(() => { load(); }, [load]);

  const { rows = [], total_points = 0 } = data || {};
  const groups = useMemo(() => {
    const sorted = [...rows].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return groupByDate(sorted);
  }, [rows]);
  const groupEntries = Object.entries(groups);

  if (loading) {
    return (
      <div className="min-h-dvh stadium-bg flex items-center justify-center">
        <div className="text-2xl font-black animate-pulse" style={{ color: 'var(--red)' }}>טוען...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh stadium-bg flex flex-col items-center justify-center gap-4 p-6">
        <div style={{ color: 'var(--text-sec)' }}>שגיאה: {error}</div>
        <button onClick={load} className="hm-btn-primary px-6 py-2 text-sm">נסה שוב</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh stadium-bg overflow-y-auto pb-8" dir="rtl">
      <header className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onBack}
          className="text-xs px-3 py-1.5 rounded-full border"
          style={{ color: 'var(--text-sec)', borderColor: 'var(--border)' }}
        >← חזרה</button>
        <div className="font-black text-base" style={{ color: 'var(--text)' }}>הניקוד שלי 📊</div>
        <div style={{ width: 64 }} />
      </header>

      <div className="px-4 space-y-4">
        <div
          className="hm-card p-4 flex items-center justify-between"
          style={{ borderColor: 'rgba(244,193,93,0.3)', borderWidth: 1 }}
        >
          <div className="text-sm" style={{ color: 'var(--text-sec)' }}>{rows.length} אירועים</div>
          <div className="text-4xl font-black tabular-nums" style={{ color: 'var(--gold)' }}>
            {total_points}
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-sec)' }}>אין נקודות עדיין</div>
        ) : (
          groupEntries.map(([label, groupRows]) => (
            <div key={label}>
              <div
                className="text-xs font-bold mb-2 px-1"
                style={{ color: 'var(--text-sec)' }}
              >
                {label}
              </div>
              <div className="hm-card overflow-hidden">
                {groupRows.map((row, idx) => {
                  const meta = REASON_MAP[row.reason] || { emoji: '•', label: row.reason };
                  return (
                    <div
                      key={row.id}
                      className="flex items-center justify-between px-4 py-3"
                      style={{
                        borderTop: idx > 0 ? '1px solid var(--border)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl leading-none">{meta.emoji}</span>
                        <div>
                          <div className="text-sm font-bold" style={{ color: 'var(--text)' }}>{meta.label}</div>
                          <div className="text-xs" style={{ color: 'var(--text-sec)' }}>{formatTime(row.created_at)}</div>
                        </div>
                      </div>
                      <div
                        className="text-base font-black tabular-nums"
                        style={{ color: 'var(--gold)', fontWeight: 900 }}
                      >
                        +{row.points}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
