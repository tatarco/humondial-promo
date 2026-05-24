import { describe, it, expect } from 'vitest';
import { validatePlayerCampaignConfig } from '../lib/campaignConfigStrict.js';
import { PLAYER_CAMPAIGN_MINIMAL_FIXTURE } from '../fixtures/playerCampaignMinimal.fixture.js';

const CHIP_FIVE = ['copper', 'mist', 'golden', 'ruby', 'violet'];

function ladderBase(overrides = {}) {
  return {
    ...PLAYER_CAMPAIGN_MINIMAL_FIXTURE,
    ...overrides,
  };
}

describe('validatePlayerCampaignConfig tiers', () => {
  it('accepts five tiers with hero_slot 1–5 covering each crest once', () => {
    const tiers = CHIP_FIVE.map((cv, slot) => ({
      id: `t${slot + 1}`,
      key: `t${slot + 1}`,
      label_he: `רמה ${slot + 1}`,
      min_points: slot * 200,
      chip_variant: cv,
      hero_slot: slot + 1,
      perks: [],
    }));
    expect(validatePlayerCampaignConfig(ladderBase({ tiers })).ok).toBe(true);
  });

  it('rejects a sixth ladder row', () => {
    const chips = [...CHIP_FIVE, 'lavender'];
    const tiers = chips.map((cv, i) => ({
      id: `t${i + 1}`,
      chip_variant: cv,
      hero_slot: (i % 5) + 1,
      min_points: i * 100,
      perks: [],
    }));
    expect(validatePlayerCampaignConfig(ladderBase({ tiers })).reason).toBe('tier_ladder_max_five');
  });

  it('rejects duplicate hero_slot', () => {
    const tiers = CHIP_FIVE.map((cv, i) => ({
      id: `t${i}`,
      chip_variant: cv,
      hero_slot: i === 4 ? 1 : i + 1,
      min_points: i * 100,
      perks: [],
    }));
    expect(validatePlayerCampaignConfig(ladderBase({ tiers })).reason).toMatch(/^tier_hero_slot_dup:1$/);
  });
});
