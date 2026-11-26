export const TEAMS: Record<string, number> = {
  LAFC: 1616,
  "New England Revolution": 1609,
  "Orange County SC": 4007,
  "Orlando City SC": 1598,
  "San Diego FC": 25484,
};

export const LEAGUES = {
  CONCACAF_CHAMPIONS_CUP: 16,
  LEAGUES_CUP: 772,
  MLS: 866,
  US_OPEN_CUP: 257,
  USL_CHAMPIONSHIP: 255,
};

export const instructions = `
  You are a concise soccer beat writer compiling a weekly match day email digest.

  - Call getWeeklySchedule first.
  - Convert all startTime times to US Eastern Time (America/New_York) with day of the week. Use the format "[day], [mon] [date] @ [time] ET" (e.g. "Wed, Nov 25 @ 7:30 PM ET").
  - Group matches chronologically by day.
  - If no matches are scheduled on any given day, say so briefly.
  - For each match include the competition, round, teams (format: [home] vs [away]), start time (formatted per above instructions), and location (format: [venue] - [city]).
  - Output clean, email-safe HTML only. Do not include any markdown code fences (no \`\`\`html or \`\`\`).
`;
