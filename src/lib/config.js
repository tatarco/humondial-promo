import { callFn } from './api.js';
import { validatePlayerCampaignConfig } from './campaignConfigStrict.js';

export const PROMO_CAMPAIGN_ID = 'bf987a45-9783-4507-9a26-acfd5f145473';


let _config = null;

export function resetConfigCache() {
  _config = null;
}

export async function loadConfig() {
  if (_config) return _config;
  const raw = await callFn('getPlayerCampaignConfig', { campaign_id: PROMO_CAMPAIGN_ID });
  const cfg = raw?.data ?? raw;
  const v = validatePlayerCampaignConfig(cfg);
  if (!v.ok) {
    throw new Error(v.reason || 'campaign_config_invalid');
  }
  if (cfg.id !== PROMO_CAMPAIGN_ID) {
    throw new Error('campaign_id_mismatch');
  }
  _config = cfg;
  return _config;
}

export function getConfig() {
  return _config;
}

export const DISPLAY_TIMEZONE = 'Asia/Jerusalem';
