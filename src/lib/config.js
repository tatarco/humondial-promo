import { callFn } from './api.js';
import { validatePlayerCampaignConfig } from './campaignConfigStrict.js';

let _config = null;

export function resetConfigCache() {
  _config = null;
}

export async function loadConfig() {
  if (_config) return _config;
  const raw = await callFn('getPlayerCampaignConfig', {});
  const cfg = raw?.data ?? raw;
  const v = validatePlayerCampaignConfig(cfg);
  if (!v.ok) {
    throw new Error(v.reason || 'campaign_config_invalid');
  }
  _config = cfg;
  return _config;
}

export function getConfig() {
  return _config;
}

export const DISPLAY_TIMEZONE = 'Asia/Jerusalem';
