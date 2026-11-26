import { TEAMS } from "./constants";
import { Env, Fixture, RawFixture } from "./types";

const API_BASE = "https://api.api-ninjas.com/v1/soccermatches";

export const fetchMatches = async (
  league: string,
  season: string,
  env: Env,
): Promise<RawFixture[]> => {
  const res = await fetch(`${API_BASE}?league=${league}&season=${season}&status=scheduled`, {
    headers: { "X-Api-Key": env.API_NINJAS_KEY },
  });

  if (!res.ok) {
    return [];
  }

  return (await res.json()) as RawFixture[];
};

export const formatFixture = (fixture: RawFixture): Fixture => ({
  date: fixture.date,
  startTime: fixture.start_time,
  competition: fixture.league,
  round: fixture.round,
  home: fixture.home_team.name,
  away: fixture.away_team.name,
  venue: fixture.venue.name,
  city: fixture.venue.city,
});

const isTrackedTeam = (name: string) => TEAMS.some((c) => name.toLocaleLowerCase().includes(c));

export const filterDomestic = (matches: RawFixture[]) =>
  matches.filter(
    (m) =>
      m.season_type === "postseason" ||
      isTrackedTeam(m.home_team.name) ||
      isTrackedTeam(m.away_team.name),
  );
