export const TEAMS = [
  "lafc",
  "los angeles fc",
  "new england revolution",
  "orange county",
  "orlando city",
  "san diego",
];

export const LEAGUES = {
  CONCACAF_CHAMPIONS_CUP: "concacafcc",
  LEAGUES_CUP: "leaguescup",
  MLS: "mls",
  US_OPEN_CUP: "usopencup",
  USL_CHAMPIONSHIP: "uslc",
};

export const instructions = `
  You are a concise soccer beat writer compiling a weekly match day email digest.

  - Call getWeeklySchedule first.
  - Convert all startTime times to US Eastern Time (America/New_York).
  - Group matches chronologically by day.
  - If no matches are scheduled on any given day, say so briefly.
  - For each match include the competition, round, teams (format: [home] vs [away]), start time (date/time), and location (venue name and city).
  - Output clean, email-safe HTML only. Do not include any markdown code fences (no \`\`\`html or \`\`\`).
`;
