import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));

import PersonalAreaScreen from '../screens/PersonalAreaScreen.jsx';
import { callFn } from '../lib/api.js';

const MOCK_DATA = {
  top50: [
    { player_id: 'p1', nickname: 'רון',  total_points: 380, rank: 1 },
    { player_id: 'p2', nickname: 'דוד',  total_points: 310, rank: 2 },
    { player_id: 'p3', nickname: 'יוסי', total_points: 280, rank: 3 },
  ],
  me: {
    player_id: 'me',
    nickname: 'גל',
    total_points: 240,
    rank: 4,
    tier: { id: 'silver', key: 'silver', label_he: 'פותח בהרכב', min_points: 100 },
    tier_detail: {
      progression_mode: 'points_only',
      show_commercial_requirements_ui: false,
      counts: { venue_visits: 3, deliveries: 1 },
      points_only_tier: { id: 'silver', label_he: 'פותח בהרכב', min_points: 100 },
      effective_tier: { id: 'silver', label_he: 'פותח בהרכב', min_points: 100 },
      next_tier: { id: 'gold', label_he: 'חלוץ חוד', min_points: 300, min_verified_visits: 0, min_deliveries: 0 },
      requirements_for_next: [],
      summary_lines_he: [],
    },
    ledger_counts: { prediction_participation: 9, delivery: 2, venue_visit: 1, table_booking: 0 },
  },
  trajectory: { projected_points: 420, days_remaining: 61, end_date: '2026-07-19' },
  tiers: [
    {
      id: 'bronze',
      key: 'bronze',
      label_he: 'שחקן ספסל',
      min_points: 0,
      perks: [{ id: 'p-b', emoji: '🍺', label_he: 'הטבה לדוגמה', per_day: true }],
    },
    { id: 'silver', key: 'silver', label_he: 'פותח בהרכב', min_points: 100, perks: [] },
    {
      id: 'gold',
      key: 'gold',
      label_he: 'חלוץ חוד',
      min_points: 300,
      perks: [{ id: 'p-g', emoji: '🎟️', label_he: 'מתנה פרימיום', per_day: false }],
    },
  ],
  whatif: {},
};

describe('PersonalAreaScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows rank and points', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText('#4')).toBeTruthy());
    expect(screen.getByText('240 נקודות')).toBeTruthy();
  });

  it('shows tier label and progress text', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getAllByText('פותח בהרכב').length).toBeGreaterThanOrEqual(1));
    expect(screen.getAllByText(/חלוץ חוד/).length).toBeGreaterThanOrEqual(1);
  });

  it('shows trajectory projection', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/420/)).toBeTruthy());
  });

  it('shows achievements section header', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/^הישגים/)).toBeTruthy());
  });

  it('shows tiers strip and expands to show backend perks text', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/דרגות/)).toBeTruthy());
    expect(screen.getAllByText('שחקן ספסל').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByText(/פתח פירוט/));
    await waitFor(() => expect(screen.getByText(/הטבה לדוגמה/)).toBeTruthy());
    expect(screen.getAllByText('שחקן ספסל').length).toBe(1);
  });

  it('omits mini top-three list but keeps leaderboard CTA', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/לוח האלופים/)).toBeTruthy());
    expect(screen.queryByText(/3 המובילים/)).toBeNull();
    expect(screen.queryByText(/^רון$/)).toBeNull();
  });

  it('has leaderboard and ledger nav buttons', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={() => {}} />);
    await waitFor(() => expect(screen.getByText(/לוח האלופים/)).toBeTruthy());
    expect(screen.getByText(/הניקוד שלי/)).toBeTruthy();
  });

  it('calls onLeaderboard when leaderboard button clicked', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    const onLeaderboard = vi.fn();
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={onLeaderboard} onLedger={() => {}} />);
    await waitFor(() => screen.getByText(/לוח האלופים/));
    screen.getByText(/לוח האלופים/).closest('button').click();
    expect(onLeaderboard).toHaveBeenCalledOnce();
  });

  it('calls onLedger when analytics button clicked', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    const onLedger = vi.fn();
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={() => {}} onLeaderboard={() => {}} onLedger={onLedger} />);
    await waitFor(() => screen.getByText(/הניקוד שלי/));
    screen.getByText(/הניקוד שלי/).closest('button').click();
    expect(onLedger).toHaveBeenCalledOnce();
  });

  test('shows loading state initially', () => {
    callFn.mockReturnValue(new Promise(() => {}));
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={vi.fn()} onLeaderboard={vi.fn()} onLedger={vi.fn()} />);
    expect(screen.getByText(/טוען/i)).toBeInTheDocument();
  });

  test('shows error and retry button when callFn rejects', async () => {
    callFn.mockRejectedValue(new Error('network'));
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={vi.fn()} onLeaderboard={vi.fn()} onLedger={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/לא הצלחנו לטעון את הנתונים/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /נסה שוב/i })).toBeInTheDocument();
  });

  test('retries on retry button click', async () => {
    callFn
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(MOCK_DATA);
    render(<PersonalAreaScreen token="t" campaignId="c" onBack={vi.fn()} onLeaderboard={vi.fn()} onLedger={vi.fn()} />);
    await waitFor(() => screen.getByRole('button', { name: /נסה שוב/i }));
    fireEvent.click(screen.getByRole('button', { name: /נסה שוב/i }));
    await waitFor(() => expect(screen.getByText(/#4/)).toBeInTheDocument());
  });
});
