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
  You are a helpful soccer schedule assistant compiling a weekly email digest.

  1. Run tool "getWeeklySchedule" first and it will return a list of matches in chronological order.
  2. Group matches by date using the date field as the heading. No NOT edit or alter the date string used for each heading.
  3. List all days individually. Do not skip or group any days. If no matches are scheduled on any given day, say so briefly.
  4. For each match include the competition, round, matchup, start time, and location.
  5. Output clean, email-safe HTML only. Do NOt use Markdown at all. Do not include any markdown code fences (no \`\`\`html or \`\`\`).
`;
