export interface Env {
  AI: Ai;
  API_NINJAS_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_ADDRESS: string;
  TRIGGER_SECRET: string;
}

export interface AgentRunResult {
  html: string;
}

export interface RawFixture {
  game_id: string;
  league: string;
  season_type: string;
  round: string;
  start_time: string;
  home_team: {
    name: string;
  };
  away_team: {
    name: string;
  };
  venue: {
    name: string;
    city: string;
  };
}

export interface Fixture {
  startTime: string;
  competition: string;
  round: string;
  home: string;
  away: string;
  venue: string;
  city: string;
}
