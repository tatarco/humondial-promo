import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/api.js', () => ({ callFn: vi.fn() }));

import LedgerScreen from '../screens/LedgerScreen.jsx';
import { callFn } from '../lib/api.js';

const todayISO = new Date().toISOString();
const MOCK_DATA = {
  total_points: 85,
  rows: [
    { id: '1', reason: 'prediction_participation', points: 10, created_at: todayISO, note: null },
    { id: '2', reason: 'delivery', points: 25, created_at: todayISO, note: null },
    { id: '3', reason: 'achievement', points: 50, created_at: todayISO, note: null },
  ],
};

describe('LedgerScreen', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows loading state initially', () => {
    callFn.mockReturnValue(new Promise(() => {}));
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    expect(screen.getByText(/טוען/i)).toBeInTheDocument();
  });

  it('renders total_points in summary', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/85/)).toBeInTheDocument());
  });

  it('renders event count in summary', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/3 אירועים/)).toBeInTheDocument());
  });

  it('shows "היום" group header for today\'s entries', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('היום')).toBeInTheDocument());
  });

  it('renders Hebrew reason label for prediction_participation', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/ניחוש/)).toBeInTheDocument());
  });

  it('renders points in gold per row (+10)', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('+10')).toBeInTheDocument());
  });

  it('calls onBack when back button clicked', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    const onBack = vi.fn();
    render(<LedgerScreen token="t" campaignId="c" onBack={onBack} />);
    await waitFor(() => screen.getByText(/חזרה/));
    fireEvent.click(screen.getByText(/חזרה/));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('shows error state when callFn rejects', async () => {
    callFn.mockRejectedValue(new Error('network error'));
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/שגיאה/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /נסה שוב/i })).toBeInTheDocument();
  });

  it('shows empty state when rows is empty', async () => {
    callFn.mockResolvedValue({ total_points: 0, rows: [] });
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => expect(screen.getByText(/אין נקודות עדיין/)).toBeInTheDocument());
  });

  test('calls getPlayerLedger with correct args', async () => {
    callFn.mockResolvedValue(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => screen.getByText('85'));
    expect(callFn).toHaveBeenCalledWith('getPlayerLedger', { token: 't', campaign_id: 'c' });
  });

  test('retry button re-fetches data', async () => {
    callFn
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(MOCK_DATA);
    render(<LedgerScreen token="t" campaignId="c" onBack={vi.fn()} />);
    await waitFor(() => screen.getByRole('button', { name: /נסה שוב/i }));
    fireEvent.click(screen.getByRole('button', { name: /נסה שוב/i }));
    await waitFor(() => expect(screen.getByText('85')).toBeInTheDocument());
  });
});
