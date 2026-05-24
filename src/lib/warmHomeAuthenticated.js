import { callFn } from './api.js';

let predictionsInflight = null;
let leaderboardInflight = null;

export function startHomeAuthenticatedWarm(campaignId, token) {
  if (!campaignId || !token) return;
  if (!predictionsInflight) {
    predictionsInflight = callFn('listMyPredictions', { token, campaign_id: campaignId });
  }
  if (!leaderboardInflight) {
    leaderboardInflight = callFn('getLeaderboard', { token, campaign_id: campaignId });
  }
}

export function takeHomeAuthenticatedWarm() {
  const out = { predictions: predictionsInflight, leaderboard: leaderboardInflight };
  predictionsInflight = null;
  leaderboardInflight = null;
  return out;
}

export function resetHomeAuthenticatedWarmForTests() {
  predictionsInflight = null;
  leaderboardInflight = null;
}
