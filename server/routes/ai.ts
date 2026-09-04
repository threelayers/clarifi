import Router from "express-promise-router";
import { z } from "zod";
import {
  demoAdvisorReply,
  demoClientReply,
  demoPreMeetingPrep,
  demoRecap,
} from "../demo.js";
import { demoFallbackEnabled, isProduction } from "../config.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { aiLimiter } from "../middleware/rateLimit.js";
import {
  generateAdvisorReply,
  generateClientReply,
  generatePreMeetingPrep,
  generateProductSuggestions,
  generateSessionRecap,
} from "../openai.js";
import { getAppStore } from "../repositories/appStore.js";
import type { SessionMessage } from "../types.js";

export const aiRouter = Router();

const messageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12000),
});

const apiKeyFrom = (req: any) => {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  if (isProduction) return "";
  return req.header("x-openai-api-key") || req.body.apiKey || "";
};

const messagesFromHistory = (
  history: Array<z.infer<typeof messageSchema>>,
): SessionMessage[] =>
  history.map((message) => ({
    id: message.id || crypto.randomUUID(),
    role: message.role,
    text: message.content,
    createdAt: new Date().toISOString(),
  }));

aiRouter.use(requireAuth, aiLimiter);

aiRouter.post("/chat/client", async (req, res) => {
  const body = z
    .object({
      history: z.array(messageSchema).min(1).max(300),
      sessionId: z.string().uuid().optional(),
      clientNotes: z.string().max(20000).optional(),
      sessionTranscript: z.string().max(100000).optional(),
      handwrittenNoteImage: z.string().max(4_000_000).optional(),
      model: z.string().max(100).optional(),
      apiKey: z.string().optional(),
    })
    .parse(req.body);
  const apiKey = apiKeyFrom(req);
  const evidence = body.sessionId
    ? await getAppStore().searchPolicy(
        req.user!,
        body.sessionId,
        body.history.at(-1)?.content || "",
      )
    : [];
  const context = {
    ...body,
    policyEvidence: evidence
      .map((item) => `${item.fileName}, page ${item.pageNumber}: ${item.quote}`)
      .join("\n"),
  };
  const reply = apiKey
    ? await generateClientReply(apiKey, body.history, body.model, context)
    : demoFallbackEnabled
      ? demoClientReply(body.history)
      : null;
  if (!reply)
    return res.status(503).json({ error: "Missing server OpenAI API key" });

  if (body.sessionId) {
    const current = await getAppStore().getSession(req.user!, body.sessionId);
    const assistantMessage: SessionMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      text: reply.reply,
      detected: reply.detected,
      misunderstanding: reply.misunderstanding || "",
      evidenceIds: reply.evidenceIds || [],
      teachBack: reply.teachBack || "",
      understanding: reply.understanding || [],
      createdAt: new Date().toISOString(),
    };
    const history = current?.state.clientMessages || [];
    const latest = messagesFromHistory(body.history.slice(-1))[0];
    const nextMessages =
      latest && !history.some((message) => message.id === latest.id)
        ? [...history, latest, assistantMessage]
        : [...history, assistantMessage];
    await getAppStore().patchSession(
      req.user!,
      body.sessionId,
      {
        clientMessages: nextMessages,
        clientNotes: body.clientNotes || "",
        sessionTranscript: body.sessionTranscript || "",
        handwrittenNoteImage: body.handwrittenNoteImage || "",
        learningPoints: reply.understanding || [],
      },
      "ai.client.reply",
    );
  }
  res.json({ ...reply, documentEvidence: evidence });
});

aiRouter.post("/chat/advisor", requireRole("advisor"), async (req, res) => {
  const body = z
    .object({
      history: z.array(messageSchema).min(1).max(300),
      sessionId: z.string().uuid().optional(),
      clientTranscript: z.string().max(100000),
      clientNotes: z.string().max(20000).optional(),
      sessionTranscript: z.string().max(100000).optional(),
      handwrittenNoteImage: z.string().max(4_000_000).optional(),
      model: z.string().max(100).optional(),
      apiKey: z.string().optional(),
    })
    .parse(req.body);
  const apiKey = apiKeyFrom(req);
  const evidence = body.sessionId
    ? await getAppStore().searchPolicy(
        req.user!,
        body.sessionId,
        body.history.at(-1)?.content || "",
      )
    : [];
  const context = {
    ...body,
    policyEvidence: evidence
      .map((item) => `${item.fileName}, page ${item.pageNumber}: ${item.quote}`)
      .join("\n"),
  };
  const reply = apiKey
    ? await generateAdvisorReply(
        apiKey,
        body.history,
        body.clientTranscript,
        body.model,
        context,
      )
    : demoFallbackEnabled
      ? demoAdvisorReply(body.history, body.clientTranscript)
      : null;
  if (!reply)
    return res.status(503).json({ error: "Missing server OpenAI API key" });

  if (body.sessionId) {
    const current = await getAppStore().getSession(req.user!, body.sessionId);
    const history = current?.state.advisorMessages || [];
    const latest = messagesFromHistory(body.history.slice(-1))[0];
    await getAppStore().patchSession(
      req.user!,
      body.sessionId,
      {
        advisorMessages: [
          ...history,
          ...(latest && !history.some((message) => message.id === latest.id)
            ? [latest]
            : []),
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: reply.reply,
            citations: reply.citations || [],
            createdAt: new Date().toISOString(),
          },
        ],
      },
      "ai.advisor.reply",
    );
  }
  res.json({ ...reply, documentEvidence: evidence });
});

aiRouter.post("/recap", requireRole("advisor"), async (req, res) => {
  const body = z
    .object({
      transcript: z.string().max(100000),
      sessionId: z.string().uuid().optional(),
      clientNotes: z.string().max(20000).optional(),
      sessionTranscript: z.string().max(100000).optional(),
      handwrittenNoteImage: z.string().max(4_000_000).optional(),
      model: z.string().max(100).optional(),
      apiKey: z.string().optional(),
    })
    .parse(req.body);
  const apiKey = apiKeyFrom(req);
  const recap = apiKey
    ? await generateSessionRecap(apiKey, body.transcript, body.model, body)
    : demoFallbackEnabled
      ? demoRecap(body.transcript)
      : null;
  if (!recap)
    return res.status(503).json({ error: "Missing server OpenAI API key" });
  if (body.sessionId) {
    await getAppStore().patchSession(
      req.user!,
      body.sessionId,
      { recap, recapApproved: false },
      "ai.recap.generated",
    );
  }
  res.json(recap);
});

aiRouter.post("/premeeting", requireRole("advisor"), async (req, res) => {
  const body = z
    .object({
      sessionId: z.string().uuid().optional(),
      model: z.string().max(100).optional(),
      apiKey: z.string().optional(),
    })
    .parse(req.body || {});
  const apiKey = apiKeyFrom(req);
  const prep = apiKey
    ? await generatePreMeetingPrep(apiKey, body.model)
    : demoFallbackEnabled
      ? demoPreMeetingPrep()
      : null;
  if (!prep)
    return res.status(503).json({ error: "Missing server OpenAI API key" });
  if (body.sessionId) {
    await getAppStore().patchSession(
      req.user!,
      body.sessionId,
      { preMeetingPrep: prep },
      "ai.premeeting.generated",
    );
  }
  res.json(prep);
});

const productEntrySchema = z.object({
  name: z.string().min(1).max(100),
  intent: z.string().min(1).max(120),
});

const productCatalogSchema = z.object({
  life: z.array(productEntrySchema).length(3),
  investment: z.array(productEntrySchema).length(3),
  critical: z.array(productEntrySchema).length(3),
  shield: z.array(productEntrySchema).length(3),
  retirement: z.array(productEntrySchema).length(3),
});

const refineDemoCatalog = (
  instruction: string,
  catalog: z.infer<typeof productCatalogSchema>,
) => {
  const replacement = instruction.match(/replace\s+(.+?)\s+with\s+(.+)/i);
  if (!replacement) {
    return {
      catalog,
      summary: "Suggestions refreshed using the advisor instruction.",
    };
  }
  const [, currentName, nextName] = replacement;
  let changed = false;
  const nextCatalog = Object.fromEntries(
    Object.entries(catalog).map(([category, products]) => [
      category,
      products.map((product) => {
        if (product.name.toLowerCase().includes(currentName.toLowerCase())) {
          changed = true;
          return { ...product, name: nextName.trim() };
        }
        return product;
      }),
    ]),
  ) as z.infer<typeof productCatalogSchema>;
  return {
    catalog: nextCatalog,
    summary: changed
      ? `Updated ${currentName.trim()} to ${nextName.trim()}.`
      : "No matching product name was found; the catalog was left unchanged.",
  };
};

aiRouter.post("/products/refine", requireRole("advisor"), async (req, res) => {
  const body = z
    .object({
      instruction: z.string().min(1).max(1000),
      catalog: productCatalogSchema,
      clientNotes: z.string().max(20000).optional(),
      sessionTranscript: z.string().max(100000).optional(),
      model: z.string().max(100).optional(),
      apiKey: z.string().optional(),
    })
    .parse(req.body);
  const apiKey = apiKeyFrom(req);
  const result = apiKey
    ? await generateProductSuggestions(
        apiKey,
        body.instruction,
        body.catalog,
        body.model,
        body,
      )
    : demoFallbackEnabled
      ? refineDemoCatalog(body.instruction, body.catalog)
      : null;
  if (!result)
    return res.status(503).json({ error: "Missing server OpenAI API key" });
  res.json(result);
});
