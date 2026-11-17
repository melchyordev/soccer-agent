import { tavilySearch } from "@tavily/ai-sdk";
import { createAI } from "agents/models/ai-sdk";
import { generateText, stepCountIs, tool } from "ai";
import { Resend } from "resend";
import { z } from "zod";

export interface Env {
  AI: Ai;
  TAVILY_API_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_ADDRESS: string;
  TRIGGER_SECRET: string;
}

interface AgentRunResult {
  summary: string;
  logs: string[];
}

const TRACKING_CONFIG = {
  timezone: "America/New_York",
  lookAheadDays: 7,
  interests: [
    "MLS: Regular season matches for San Diego FC, New England Revolution, and Orlando City SC ONLY. If MLS Cup Playoffs are active, cover all playoff matches. Also include major updates to the Supporter's Shield and Golden Boot races.",
    "USL Championship: Regular season matches for Orange County SC ONLY. If USL Championship playoffs are active, cover all playoff matches.",
    "USL Cup: Orange County SC matches ONLY for all rounds of the tournament.",
    "CONCACAF Champions Cup: ALL matches and tournament updates.",
    "U.S. Open Cup: ALL matches and tournament updates.",
    "Leagues Cup: ALL matches and tournament updates.",
  ],
};

async function runSoccerAgent(env: Env, loggingEnabled = false): Promise<AgentRunResult> {
  const logs: string[] = [];
  const ai = createAI({ binding: env.AI });
  const resend = new Resend(env.RESEND_API_KEY);

  const today = new Date().toLocaleDateString("us-en", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: TRACKING_CONFIG.timezone,
  });

  const log = (message: string, data?: unknown) => {
    if (!loggingEnabled) return;

    const timestamp = new Date().toISOString();
    const formattedData = data !== undefined ? ` | ${JSON.stringify(data)}` : "";
    const entry = `[${timestamp}] ${message}${formattedData}`;

    logs.push(entry);
    console.log(entry);
  };

  const sendEmailTool = tool({
    description: "Send the final formatted HTML soccer briefing via email",
    inputSchema: z.object({
      subject: z.string().describe("Concise email subject line with date range"),
      htmlBody: z.string().describe("Clean, scannable HTML email body"),
    }),
    execute: async ({ subject, htmlBody }) => {
      log("[sendEmail] Sending email", { subject });

      const { data, error } = await resend.emails.send({
        from: "Soccer Agent <onboarding@resend.dev>",
        to: [env.EMAIL_ADDRESS],
        subject,
        html: htmlBody,
      });

      if (error) {
        log("[sendEmail] Failed", { error });
        throw new Error(`Resend error: ${error.message}`);
      }

      log("[sendEmail] Sent");
      return { status: "sent", emailId: data.id };
    },
  });

  const instructions = `
    You are a personal soccer research agent. Today's date is ${today}.
    Gather upcoming match schedules (next ${TRACKING_CONFIG.lookAheadDays} days), US broadcast/streaming info, and key team/tournament news.

    STRICT TRACKING RULES:
    ${TRACKING_CONFIG.interests.map((x, i) => `${i + 1}. ${x}`).join("\n")}

    WORKFLOW:
    1. Run targeted web searches using 'tavilySearch' for each competition/team above based on today's date (${today}). Combine related queries where helpful to stay efficient.
    2. For any upcoming match found, verify WHERE to watch/stream it in the US and convert the start time to ${TRACKING_CONFIG.timezone} (ET).
    3. Filter out social media fluff, rumors, and teams not on the list. Briefly note "Off Season / No upcoming matches" for inactive teams/tournaments.
    4. Never include any match results or scores.
    5. Call 'sendEmail' with a clean, scannable HTML digest grouped by league/team or tournament.
  `;

  log("[generateText] Starting agent run", { date: today });

  const result = await generateText({
    model: ai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    instructions,
    prompt:
      "Compile my soccer schedule, streaming guide, and news briefing for the next 7 days and email it to me.",
    tools: {
      tavilySearch: tavilySearch({
        apiKey: env.TAVILY_API_KEY,
        searchDepth: "basic",
        maxResults: 3,
      }),
      sendEmail: sendEmailTool,
    },
    stopWhen: stepCountIs(12),
    onToolExecutionStart: ({ toolCall }) => {
      if (toolCall.toolName === "tavilySearch") {
        log("[tavilySearch] Query", toolCall.input);
      }
    },
    onToolExecutionEnd: ({ toolCall, toolOutput }) => {
      if (toolCall.toolName === "tavilySearch" && toolOutput.type === "tool-result") {
        log("[tavilySearch] Completed", toolOutput.output);
      }
    },
    onStepEnd: ({ finishReason, toolCalls, usage }) => {
      log(`[generateText] Step finished (${finishReason})`, {
        toolsCalled: toolCalls.map((t) => t.toolName),
        tokensUsed: usage.totalTokens,
      });
    },
  });

  log("[generateText] Completed", {
    totalSteps: result.steps.length,
    totalTokens: result.usage.totalTokens,
  });

  return { summary: result.text, logs };
}

export default {
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runSoccerAgent(env, false));
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
        const { summary, logs } = await runSoccerAgent(env, true);

        return Response.json(
          {
            status: "completed",
            summary,
            logs,
          },
          { status: 200 },
        );
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
