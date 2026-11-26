import { ApiSportsEnvelope, Env, Fixture, RawFixture } from "./types";

const API_BASE = "https://v3.football.api-sports.io";

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const isPlayoffRound = (round: string) =>
  /play-?off|final|semi|quarter|round of 16|knockout|wild card/i.test(round);

export const fetchFootballApi = async (path: string, env: Env): Promise<RawFixture[]> => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "x-apisports-key": env.FOOTBALL_API_KEY },
  });

  if (!res.ok) {
    return [];
  }

  const data = (await res.json()) as ApiSportsEnvelope<RawFixture>;
  return data.response;
};

export const formatFixture = (fixture: RawFixture): Fixture => ({
  startTime: fixture.fixture.date,
  competition: fixture.league.name,
  round: fixture.league.round,
  home: fixture.teams.home.name,
  away: fixture.teams.away.name,
  venue: fixture.fixture.venue.name,
  city: fixture.fixture.venue.city,
});
