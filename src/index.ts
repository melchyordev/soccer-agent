import { tavilySearch } from "@tavily/ai-sdk";
import { createAI } from "agents/models/ai-sdk";
import { stepCountIs, ToolLoopAgent } from "ai";
import { Resend } from "resend";

import { formatDate, getPrompt, instructions } from "./instructions";

export interface Env {
  AI: Ai;
  TAVILY_API_KEY: string;
  RESEND_API_KEY: string;
  EMAIL_ADDRESS: string;
  TRIGGER_SECRET: string;
}

interface AgentRunResult {
  message: string;
  logs: string[];
}

async function runSoccerAgent(env: Env, loggingEnabled = false): Promise<AgentRunResult> {
  const today = formatDate(new Date());
  const logs: string[] = [];
  const ai = createAI({ binding: env.AI });
  const resend = new Resend(env.RESEND_API_KEY);

  const log = (message: string, data?: unknown) => {
    if (!loggingEnabled) return;

    const timestamp = new Date().toISOString();
    const formattedData = data !== undefined ? ` | ${JSON.stringify(data)}` : "";
    const entry = `[${timestamp}] ${message}${formattedData}`;

    logs.push(entry);
    console.log(entry);
  };

  log("[generateText] Starting agent run", { date: today });

  const agent = new ToolLoopAgent({
    model: ai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
    instructions,
    tools: {
      tavilySearch: tavilySearch({
        apiKey: env.TAVILY_API_KEY,
        searchDepth: "advanced",
        maxResults: 5,
        includeDomains: [
          "espn.com",
          "mlssoccer.com",
          "uslchampionship.com",
          "concacaf.com",
          "ussoccer.com",
          "livesoccertv.com",
          "goal.com",
        ],
      }),
    },
    stopWhen: stepCountIs(25),
    temperature: 0.1,
    onToolExecutionStart: ({ toolCall }) => {
      log("[tavilySearch] Query", toolCall.input);
    },
    onToolExecutionEnd: ({ toolOutput }) => {
      if (toolOutput.type === "tool-error") {
        log("[tavilySearch] Error", { error: toolOutput.error });
      } else {
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

  const result = await agent.generate({
    prompt: getPrompt(),
  });

  log("[generateText] Completed", {
    totalSteps: result.steps.length,
    totalTokens: result.usage.totalTokens,
  });

  log("[Email] Sending email");

  const { data, error } = await resend.emails.send({
    from: "Soccer Agent <onboarding@resend.dev>",
    to: [env.EMAIL_ADDRESS],
    subject: `Soccer Briefing for ${today}`,
    html: result.text
      .replace(/^```html\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim(),
  });

  if (error) {
    log("[Email] Failed", { error });
    throw new Error(`Resend error: ${error.message}`);
  }

  log("[Email] Sent");

  return { message: `Email ${data.id} sent`, logs };
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
        const result = await runSoccerAgent(env, true);

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
