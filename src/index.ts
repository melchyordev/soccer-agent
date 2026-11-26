import { createAI } from "agents/models/ai-sdk";
import { jsonSchema, stepCountIs, tool, ToolLoopAgent } from "ai";
import { Resend } from "resend";

import { instructions, LEAGUES } from "./constants";
import { AgentRunResult, Env } from "./types";
import { fetchMatches, filterDomestic, formatFixture } from "./utils";

async function runSoccerAgent(env: Env): Promise<AgentRunResult> {
  const ai = createAI({ binding: env.AI });
  const resend = new Resend(env.RESEND_API_KEY);

  const today = Temporal.Now.plainDateISO("America/New_York");
  const nextWeek = today.add({ days: 7 });
  const season = today.year.toString();

  const getWeeklySchedule = tool({
    description:
      "Fetch all scheduled soccer matches for tracked teams and leagues for the upcoming 8-day Sunday to Sunday window.",
    inputSchema: jsonSchema({ type: "object", properties: {}, additionalProperties: false }),
    execute: async () => {
      const [mls, uslc, openCup, leaguesCup, concacaf] = await Promise.all([
        fetchMatches(LEAGUES.MLS, season, env),
        fetchMatches(LEAGUES.USL_CHAMPIONSHIP, season, env),
        fetchMatches(LEAGUES.US_OPEN_CUP, season, env),
        fetchMatches(LEAGUES.LEAGUES_CUP, season, env),
        fetchMatches(LEAGUES.CONCACAF_CHAMPIONS_CUP, season, env),
      ]);

      const combined = [
        ...filterDomestic(mls),
        ...filterDomestic(uslc),
        ...openCup,
        ...leaguesCup,
        ...concacaf,
      ];

      const seen = new Set<string>();

      return combined
        .filter((f) => {
          if (!f.game_id || seen.has(f.game_id)) return false;
          seen.add(f.game_id);
          return (
            Temporal.PlainDate.compare(f.date, today) >= 0 &&
            Temporal.PlainDate.compare(f.date, nextWeek) <= 0
          );
        })
        .map((f) => formatFixture(f));
    },
  });

  const agent = new ToolLoopAgent({
    model: ai("@cf/zai-org/glm-4.7-flash"),
    instructions,
    tools: { getWeeklySchedule },
    stopWhen: stepCountIs(5),
  });

  const { text } = await agent.generate({
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

  return { html };
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
        const { html } = await runSoccerAgent(env);

        return new Response(html, { headers: { "Content-Type": "text/html" }, status: 200 });
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
