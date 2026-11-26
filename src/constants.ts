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

  - Call getWeeklySchedule first and it will return a list of matches in chronological order.
  - Group matches chronologically by date and use the date field as the heading.
  - List all days. Do not skip any days. If no matches are scheduled on any given day, say so briefly.
  - For each match include the competition, round, matchup, start time, and location.
  - Output clean, email-safe HTML only. Do not include any markdown code fences (no \`\`\`html or \`\`\`).
`;
