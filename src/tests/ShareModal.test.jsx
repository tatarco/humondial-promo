import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('../lib/shareCard.js', () => ({
  drawShareCard: vi.fn(() => Promise.resolve(new Blob(['img'], { type: 'image/png' }))),
  fillTemplatePlaceholders: vi.fn((t) => t),
}));
vi.mock('../lib/useShareBonus.js', () => ({
  useShareBonus: vi.fn(),
}));

import ShareModal from '../components/ShareModal.jsx';
import { useShareBonus } from '../lib/useShareBonus.js';

const mockShareBonus = (overrides = {}) => ({
  shareEnabled: true,
  bonusPoints: 5,
  template: { headline_he: 'test headline', subline_he: '', cta_he: '', hashtags: '' },
  hasAttemptedShare: false,
  markAttempted: vi.fn(),
  claim: vi.fn(),
  claiming: false,
  claimed: false,
  alreadyClaimed: false,
  pointsGranted: 0,
  ...overrides,
});

const DEFAULT_PROPS = {
  context: 'rank_share',
  cardData: { rank: 3, points: 100, tier_name: 'זהב' },
  token: 'tok',
  campaignId: 'cid',
  onClose: vi.fn(),
};

describe('ShareModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useShareBonus.mockReturnValue(mockShareBonus());
  });

  it('renders share button', async () => {
    render(<ShareModal {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText(/שתף/i)).toBeInTheDocument());
  });

  it('claim button is disabled before share tap', async () => {
    render(<ShareModal {...DEFAULT_PROPS} />);
    await waitFor(() => {
      const btn = screen.getByText(/שתפתי/i).closest('button');
      expect(btn).toBeDisabled();
    });
  });

  it('claim button is enabled after hasAttemptedShare=true', async () => {
    useShareBonus.mockReturnValue(mockShareBonus({ hasAttemptedShare: true }));
    render(<ShareModal {...DEFAULT_PROPS} />);
    await waitFor(() => {
      const btn = screen.getByText(/שתפתי/i).closest('button');
      expect(btn).not.toBeDisabled();
    });
  });

  it('calls onClose when close button clicked', async () => {
    const onClose = vi.fn();
    render(<ShareModal {...DEFAULT_PROPS} onClose={onClose} />);
    await waitFor(() => screen.getByText(/✕/));
    fireEvent.click(screen.getByText(/✕/));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows success message when claimed and not already_claimed', async () => {
    useShareBonus.mockReturnValue(mockShareBonus({ claimed: true, pointsGranted: 5, alreadyClaimed: false }));
    render(<ShareModal {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText(/5 נקודות/)).toBeInTheDocument());
  });

  it('shows already_claimed message when claimed and already_claimed=true', async () => {
    useShareBonus.mockReturnValue(mockShareBonus({ claimed: true, alreadyClaimed: true }));
    render(<ShareModal {...DEFAULT_PROPS} />);
    await waitFor(() => expect(screen.getByText(/כבר קיבלת נקודות/i)).toBeInTheDocument());
  });

  it('returns null when shareEnabled=false', () => {
    useShareBonus.mockReturnValue(mockShareBonus({ shareEnabled: false }));
    const { container } = render(<ShareModal {...DEFAULT_PROPS} />);
    expect(container.firstChild).toBeNull();
  });
});
