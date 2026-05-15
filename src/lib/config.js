import { callFn } from './api.js';

let _config = null;

export async function loadConfig() {
  if (_config) return _config;
  _config = await callFn('getCampaignConfig', {});
  return _config;
}

export function getConfig() {
  return _config;
}

export const DISPLAY_TIMEZONE = 'Asia/Jerusalem';
