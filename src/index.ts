import { createAI } from "agents/models/ai-sdk";
import { jsonSchema, stepCountIs, tool, ToolLoopAgent } from "ai";
import { Resend } from "resend";

import { instructions, LEAGUES, TEAMS } from "./constants";
import { AgentRunResult, Env, RawFixture } from "./types";
import { fetchFootballApi, formatFixture, isPlayoffRound, sleep } from "./utils";

async function runSoccerAgent(env: Env): Promise<AgentRunResult> {
  const ai = createAI({ binding: env.AI });
  const resend = new Resend(env.RESEND_API_KEY);

  const today = Temporal.Now.plainDateISO("America/New_York");
  const nextWeek = today.add({ days: 7 });

  const getWeeklySchedule = tool({
    description:
      "Fetch all scheduled soccer matches for tracked teams and leagues for the upcoming 8-day Sunday to Sunday window.",
    inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
    execute: async () => {
      const rawFixtures: RawFixture[] = [];

      for (const team in Object.values(TEAMS)) {
        const data = await fetchFootballApi(
          `/fixtures?team=${team}&season=${today.year}&from=${today.toString()}&to=${nextWeek.toString()}`,
          env,
        );
        rawFixtures.push(...data);
      }

      await sleep(7000);

      for (const [key, leagueId] of Object.entries(LEAGUES)) {
        const data = await fetchFootballApi(
          `/fixtures?league=${leagueId}&season=${today.year}&from=${today.toString()}&to=${nextWeek.toString()}`,
          env,
        );
        if (key === "MLS" || key === "USL_CHAMPIONSHIP") {
          rawFixtures.push(...data.filter((f) => isPlayoffRound(f.league.round)));
        } else {
          rawFixtures.push(...data);
        }
      }

      const seen = new Set<number>();

      return rawFixtures
        .filter((f) => {
          if (seen.has(f.fixture.id)) return false;
          seen.add(f.fixture.id);
          return true;
        })
        .sort((a, b) => Date.parse(a.fixture.date) - Date.parse(b.fixture.date))
        .map((f) => formatFixture(f));
    },
  });

  const agent = new ToolLoopAgent({
    model: ai("@cf/zai-org/glm-4.7-flash"),
    instructions,
    tools: { getWeeklySchedule },
    stopWhen: stepCountIs(5),
  });

  const { text, toolResults } = await agent.generate({
    prompt: "Compile the weekly soccer digest ",
  });

  const html = text
    .replace(/^```html\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const { error } = await resend.emails.send({
    from: "Soccer Agent <onboarding@resend.dev>",
    to: [env.EMAIL_ADDRESS],
    subject: `Soccer Matches from ${today.toString()} to ${nextWeek.toString()}`,
    html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { html, toolResults: toolResults[0].output };
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runSoccerAgent(env));
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/run") {
      const authHeader = request.headers.get("Authorization");
      const queryToken = url.searchParams.get("token");
      const providedToken = authHeader?.replace("Bearer ", "") || queryToken;

      if (!env.TRIGGER_SECRET || providedToken !== env.TRIGGER_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      try {
        const result = await runSoccerAgent(env);

        return Response.json(result, { status: 200 });
      } catch (error: any) {
        return Response.json(
          { status: "error", message: error.message || "Unknown error" },
          { status: 500 },
        );
      }
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
