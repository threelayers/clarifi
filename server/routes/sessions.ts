import Router from "express-promise-router";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getAppStore } from "../repositories/appStore.js";
import type { AppUser, SessionRecord } from "../types.js";

export const sessionsRouter = Router();

const understandingSchema = z.object({
  point: z.string().min(1).max(500),
  status: z.enum(["covered", "not_covered", "action"])
});

const messageSchema = z.object({
  id: z.string().min(1).max(100),
  role: z.enum(["user", "assistant"]),
  text: z.string().max(12000),
  createdAt: z.string().datetime().optional().default(() => new Date().toISOString()),
  detected: z.boolean().optional(),
  misunderstanding: z.string().max(1000).optional(),
  evidenceIds: z.array(z.string().max(100)).max(30).optional(),
  teachBack: z.string().max(1000).optional(),
  understanding: z.array(understandingSchema).max(50).optional(),
  citations: z.array(z.object({ source: z.string().max(200), quote: z.string().max(2000) })).max(30).optional()
});

const recapSchema = z.object({
  covered: z.array(z.string().max(1000)).max(50),
  notCovered: z.array(z.string().max(1000)).max(50),
  followUps: z.array(z.string().max(1000)).max(50)
});

const prepSchema = z.object({
  advisorBrief: z.string().max(5000),
  likelyConcerns: z.array(z.string().max(1000)).max(30),
  suggestedQuestions: z.array(z.string().max(1000)).max(30),
  clientWidget: z.object({ title: z.string().max(300), bullets: z.array(z.string().max(500)).max(20) })
});

const statePatchSchema = z.object({
  clientMessages: z.array(messageSchema).max(300).optional(),
  advisorMessages: z.array(messageSchema).max(300).optional(),
  clientNotes: z.string().max(20000).optional(),
  sessionTranscript: z.string().max(100000).optional(),
  handwrittenNoteImage: z.string().max(4_000_000).optional(),
  learningPoints: z.array(understandingSchema).max(100).optional(),
  selectedCoverageIds: z.array(z.string().max(100)).max(100).optional(),
  selectedDecisionIds: z.array(z.string().max(100)).max(100).optional(),
  recap: recapSchema.nullable().optional(),
  recapApproved: z.boolean().optional(),
  preMeetingPrep: prepSchema.optional()
});

const visibleSession = (user: AppUser, session: SessionRecord) => user.role === "advisor"
  ? session
  : {
      ...session,
      joinCode: "",
      state: { ...session.state, advisorMessages: [] }
    };

sessionsRouter.use(requireAuth);

sessionsRouter.get("/", async (req, res) => {
  const sessions = await getAppStore().listSessions(req.user!);
  res.json({
    sessions: sessions.map((session) => ({
      id: session.id,
      title: session.title,
      status: session.status,
      joinCode: req.user!.role === "advisor" ? session.joinCode : "",
      version: session.version,
      updatedAt: session.updatedAt
    })),
    persistenceMode: getAppStore().mode
  });
});

sessionsRouter.get("/current", async (req, res) => {
  const session = await getAppStore().getSession(req.user!);
  if (!session) return res.status(404).json({ error: "No session found" });
  res.json({ session: visibleSession(req.user!, session), persistenceMode: getAppStore().mode });
});

sessionsRouter.post("/", requireRole("advisor"), async (req, res) => {
  const body = z.object({ title: z.string().trim().min(3).max(120) }).parse(req.body);
  const session = await getAppStore().createSession(req.user!, body.title);
  res.status(201).json({ session });
});

sessionsRouter.post("/join", requireRole("client"), async (req, res) => {
  const body = z.object({ joinCode: z.string().trim().min(4).max(20) }).parse(req.body);
  const session = await getAppStore().joinSession(req.user!, body.joinCode);
  if (!session) return res.status(404).json({ error: "Session code is invalid or already assigned" });
  res.json({ session: visibleSession(req.user!, session) });
});

sessionsRouter.get("/:sessionId", async (req, res) => {
  const session = await getAppStore().getSession(req.user!, req.params.sessionId);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.setHeader("ETag", `\"${session.version}\"`);
  res.json({ session: visibleSession(req.user!, session), persistenceMode: getAppStore().mode });
});

sessionsRouter.patch("/:sessionId/state", async (req, res) => {
  const parsed = statePatchSchema.parse(req.body);
  const clientFields = new Set(["clientMessages", "clientNotes", "sessionTranscript", "handwrittenNoteImage"]);
  const advisorFields = new Set(["clientMessages", "advisorMessages", "sessionTranscript", "learningPoints", "selectedCoverageIds", "selectedDecisionIds", "recap", "recapApproved", "preMeetingPrep"]);
  const allowed = req.user!.role === "advisor" ? advisorFields : clientFields;
  const forbidden = Object.keys(parsed).filter((key) => !allowed.has(key));
  if (forbidden.length) return res.status(403).json({ error: `Cannot update: ${forbidden.join(", ")}` });
  const session = await getAppStore().patchSession(req.user!, req.params.sessionId, parsed, "session.state.updated");
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ session: visibleSession(req.user!, session) });
});

sessionsRouter.get("/:sessionId/audit", requireRole("advisor"), async (req, res) => {
  const events = await getAppStore().listAudit(req.user!, req.params.sessionId);
  res.json({ events });
});
