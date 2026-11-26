import { TEAMS } from "./constants";
import { Env, Fixture, RawFixture } from "./types";

const API_BASE = "https://api.api-ninjas.com/v1/soccermatches";
const TIMEZONE = "America/New_York";

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

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: TIMEZONE,
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
  timeZone: TIMEZONE,
});

export const formatFixture = (fixture: RawFixture): Fixture => ({
  date: dateFormatter.format(new Date(fixture.start_time)),
  startTime: timeFormatter.format(new Date(fixture.start_time)),
  competition: fixture.league,
  round: fixture.round,
  matchup: `${fixture.home_team.name} vs ${fixture.away_team.name}`,
  location: `${fixture.venue.name} in ${fixture.venue.city}`,
});

const isTrackedTeam = (name: string) => TEAMS.some((c) => name.toLocaleLowerCase().includes(c));

export const filterDomestic = (matches: RawFixture[]) =>
  matches.filter(
    (m) =>
      m.season_type === "postseason" ||
      isTrackedTeam(m.home_team.name) ||
      isTrackedTeam(m.away_team.name),
  );
