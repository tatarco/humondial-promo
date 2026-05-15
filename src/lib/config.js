export const campaignConfig = {
  displayTimezone:       import.meta.env.VITE_CAMPAIGN_DISPLAY_TZ      || 'Asia/Jerusalem',
  participationPoints:   Number(import.meta.env.VITE_CAMPAIGN_PARTICIPATION_PTS) || 10,
  lockOffsetMinutes:     Number(import.meta.env.VITE_CAMPAIGN_LOCK_OFFSET_MIN)   || 0,
};
