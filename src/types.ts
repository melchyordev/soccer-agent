export interface Env {
  AI: Ai;
  FOOTBALL_API_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_ADDRESS: string;
  TRIGGER_SECRET: string;
}

export interface AgentRunResult {
  html: string;
}

export interface ApiSportsEnvelope<T> {
  response: T[];
  [key: string]: unknown;
}

export interface RawFixture {
  fixture: {
    id: number;
    date: string;
    venue: {
      name: string;
      city: string;
    };
  };
  league: {
    name: string;
    round: string;
  };
  teams: {
    home: {
      name: string;
    };
    away: {
      name: string;
    };
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
