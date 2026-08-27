import bcrypt from "bcryptjs";
import { and, desc, eq, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import { demoAccounts } from "../auth/demoAccounts.js";
import { getDb } from "../db/client.js";
import { auditEvents, conversations, policyDocuments, policyPages, users } from "../db/schema.js";
import { createDefaultSessionState, DEMO_JOIN_CODE, DEMO_SESSION_ID } from "../sessionDefaults.js";
import type { AppUser, AuditRecord, PolicyDocumentSummary, PolicyEvidence, SessionRecord, SessionState } from "../types.js";

type SessionPatch = Partial<Pick<SessionState,
  | "clientMessages"
  | "advisorMessages"
  | "clientNotes"
  | "sessionTranscript"
  | "handwrittenNoteImage"
  | "learningPoints"
  | "selectedCoverageIds"
  | "selectedDecisionIds"
  | "recap"
  | "recapApproved"
  | "preMeetingPrep"
>>;

export type StoredPolicy = PolicyDocumentSummary & {
  conversationId: string;
  uploadedBy: string;
  contentType: string;
  storageKey: string;
};

type StoredPage = { id: string; documentId: string; pageNumber: number; content: string; searchText: string };

export interface AppStore {
  readonly mode: "postgres" | "memory";
  getUserById(id: string): Promise<AppUser | null>;
  getUserByEmail(email: string): Promise<AppUser | null>;
  getUserByDemoAccount(accountId: string): Promise<AppUser | null>;
  createUser(input: Omit<AppUser, "id">): Promise<AppUser>;
  ensureDemoData(): Promise<void>;
  listSessions(user: AppUser): Promise<SessionRecord[]>;
  getSession(user: AppUser, sessionId?: string): Promise<SessionRecord | null>;
  createSession(advisor: AppUser, title: string): Promise<SessionRecord>;
  joinSession(client: AppUser, joinCode: string): Promise<SessionRecord | null>;
  patchSession(user: AppUser, sessionId: string, patch: SessionPatch, action: string): Promise<SessionRecord | null>;
  savePolicyDocument(input: {
    user: AppUser;
    sessionId: string;
    fileName: string;
    contentType: string;
    byteSize: number;
    storageProvider: StoredPolicy["storageProvider"];
    storageKey: string;
    pages: Array<{ pageNumber: number; content: string }>;
  }): Promise<PolicyDocumentSummary | null>;
  searchPolicy(user: AppUser, sessionId: string, query: string): Promise<PolicyEvidence[]>;
  getPolicyDocument(user: AppUser, sessionId: string, documentId: string): Promise<StoredPolicy | null>;
  writeAudit(event: Omit<AuditRecord, "id" | "createdAt">): Promise<void>;
  listAudit(user: AppUser, sessionId: string): Promise<AuditRecord[]>;
  health(): Promise<{ configured: boolean; ok: boolean; mode: string }>;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const canAccess = (user: AppUser, session: Pick<SessionRecord, "advisorId" | "clientId">) =>
  session.advisorId === user.id || session.clientId === user.id;

const sessionRow = (
  row: typeof conversations.$inferSelect,
  documents: PolicyDocumentSummary[] = []
): SessionRecord => ({
  id: row.id,
  advisorId: row.advisorId,
  clientId: row.clientId,
  title: row.title,
  joinCode: row.joinCode,
  status: row.status,
  state: row.state as SessionState,
  version: row.version,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  policyDocuments: documents
});

const userRow = (row: typeof users.$inferSelect): AppUser => ({
  id: row.id,
  email: row.email,
  name: row.name,
  passwordHash: row.passwordHash,
  role: row.role,
  demoAccountId: row.demoAccountId
});

const policySummary = (row: typeof policyDocuments.$inferSelect): PolicyDocumentSummary => ({
  id: row.id,
  fileName: row.fileName,
  byteSize: row.byteSize,
  pageCount: row.pageCount,
  storageProvider: row.storageProvider,
  createdAt: row.createdAt.toISOString()
});

const scorePage = (query: string, content: string) => {
  const terms = query.toLowerCase().split(/\s+/).map((term) => term.trim()).filter((term) => term.length > 1);
  if (!terms.length) return 0;
  const haystack = content.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
};

const quoteFromPage = (query: string, content: string) => {
  const normalized = content.replace(/\s+/g, " ").trim();
  const term = query.toLowerCase().split(/\s+/).find((item) => item.length > 2 && normalized.toLowerCase().includes(item));
  const index = term ? normalized.toLowerCase().indexOf(term) : 0;
  const start = Math.max(0, index - 90);
  return normalized.slice(start, start + 360).trim();
};

class MemoryStore implements AppStore {
  readonly mode = "memory" as const;
  private userRecords = new Map<string, AppUser>();
  private sessionRecords = new Map<string, SessionRecord>();
  private policyRecords = new Map<string, StoredPolicy>();
  private pageRecords: StoredPage[] = [];
  private auditRecords: AuditRecord[] = [];
  private initialized = false;

  async ensureDemoData() {
    if (this.initialized) return;
    for (const account of demoAccounts) {
      this.userRecords.set(account.id, {
        id: account.id,
        email: account.email,
        name: account.name,
        passwordHash: await bcrypt.hash(account.password, 8),
        role: account.role,
        demoAccountId: account.accountId
      });
    }
    const now = new Date().toISOString();
    this.sessionRecords.set(DEMO_SESSION_ID, {
      id: DEMO_SESSION_ID,
      advisorId: demoAccounts[0].id,
      clientId: demoAccounts[1].id,
      title: "Tan Li Wen - Hospitalisation clarity",
      joinCode: DEMO_JOIN_CODE,
      status: "active",
      state: createDefaultSessionState(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      policyDocuments: []
    });
    this.initialized = true;
  }

  async getUserById(id: string) {
    await this.ensureDemoData();
    return this.userRecords.get(id) || null;
  }

  async getUserByEmail(email: string) {
    await this.ensureDemoData();
    return [...this.userRecords.values()].find((user) => user.email === normalizeEmail(email)) || null;
  }

  async getUserByDemoAccount(accountId: string) {
    await this.ensureDemoData();
    return [...this.userRecords.values()].find((user) => user.demoAccountId === accountId) || null;
  }

  async createUser(input: Omit<AppUser, "id">) {
    const user = { ...input, id: crypto.randomUUID(), email: normalizeEmail(input.email) };
    this.userRecords.set(user.id, user);
    return user;
  }

  async listSessions(user: AppUser) {
    await this.ensureDemoData();
    return [...this.sessionRecords.values()].filter((session) => canAccess(user, session));
  }

  async getSession(user: AppUser, sessionId?: string) {
    const sessions = await this.listSessions(user);
    return (sessionId ? sessions.find((session) => session.id === sessionId) : sessions[0]) || null;
  }

  async createSession(advisor: AppUser, title: string) {
    const now = new Date().toISOString();
    const session: SessionRecord = {
      id: crypto.randomUUID(),
      advisorId: advisor.id,
      clientId: null,
      title,
      joinCode: nanoid(8).toUpperCase(),
      status: "active",
      state: createDefaultSessionState(),
      version: 1,
      createdAt: now,
      updatedAt: now,
      policyDocuments: []
    };
    this.sessionRecords.set(session.id, session);
    await this.writeAudit({ conversationId: session.id, actorId: advisor.id, action: "session.created", metadata: {}, success: true });
    return session;
  }

  async joinSession(client: AppUser, joinCode: string) {
    await this.ensureDemoData();
    const session = [...this.sessionRecords.values()].find((item) => item.joinCode === joinCode.trim().toUpperCase());
    if (!session || (session.clientId && session.clientId !== client.id)) return null;
    session.clientId = client.id;
    session.version += 1;
    session.updatedAt = new Date().toISOString();
    await this.writeAudit({ conversationId: session.id, actorId: client.id, action: "session.joined", metadata: {}, success: true });
    return session;
  }

  async patchSession(user: AppUser, sessionId: string, patch: SessionPatch, action: string) {
    const session = await this.getSession(user, sessionId);
    if (!session) return null;
    session.state = { ...session.state, ...structuredClone(patch) };
    session.version += 1;
    session.updatedAt = new Date().toISOString();
    await this.writeAudit({ conversationId: sessionId, actorId: user.id, action, metadata: { fields: Object.keys(patch) }, success: true });
    return session;
  }

  async savePolicyDocument(input: Parameters<AppStore["savePolicyDocument"]>[0]) {
    const session = await this.getSession(input.user, input.sessionId);
    if (!session || input.user.role !== "advisor") return null;
    const now = new Date().toISOString();
    const document: StoredPolicy = {
      id: crypto.randomUUID(),
      conversationId: input.sessionId,
      uploadedBy: input.user.id,
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: input.byteSize,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      pageCount: input.pages.length,
      createdAt: now
    };
    this.policyRecords.set(document.id, document);
    this.pageRecords.push(...input.pages.map((page) => ({
      id: crypto.randomUUID(),
      documentId: document.id,
      pageNumber: page.pageNumber,
      content: page.content,
      searchText: page.content.toLowerCase()
    })));
    session.policyDocuments = [...session.policyDocuments, policySummaryFromStored(document)];
    session.version += 1;
    session.updatedAt = now;
    await this.writeAudit({ conversationId: session.id, actorId: input.user.id, action: "policy.uploaded", metadata: { fileName: input.fileName, pages: input.pages.length }, success: true });
    return policySummaryFromStored(document);
  }

  async searchPolicy(user: AppUser, sessionId: string, query: string) {
    const session = await this.getSession(user, sessionId);
    if (!session) return [];
    return this.pageRecords
      .map((page) => {
        const document = this.policyRecords.get(page.documentId);
        if (!document || document.conversationId !== sessionId) return null;
        const score = scorePage(query, page.searchText);
        if (!score) return null;
        return {
          id: page.id,
          documentId: document.id,
          fileName: document.fileName,
          pageNumber: page.pageNumber,
          quote: quoteFromPage(query, page.content),
          score
        } satisfies PolicyEvidence;
      })
      .filter((item): item is PolicyEvidence => Boolean(item))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  async getPolicyDocument(user: AppUser, sessionId: string, documentId: string) {
    const session = await this.getSession(user, sessionId);
    if (!session) return null;
    const document = this.policyRecords.get(documentId);
    return document?.conversationId === sessionId ? document : null;
  }

  async writeAudit(event: Omit<AuditRecord, "id" | "createdAt">) {
    this.auditRecords.unshift({ ...event, id: crypto.randomUUID(), createdAt: new Date().toISOString() });
  }

  async listAudit(user: AppUser, sessionId: string) {
    const session = await this.getSession(user, sessionId);
    if (!session || user.role !== "advisor") return [];
    return this.auditRecords.filter((event) => event.conversationId === sessionId).slice(0, 100);
  }

  async health() {
    return { configured: false, ok: true, mode: "memory-fallback" };
  }
}

const policySummaryFromStored = (row: StoredPolicy): PolicyDocumentSummary => ({
  id: row.id,
  fileName: row.fileName,
  byteSize: row.byteSize,
  pageCount: row.pageCount,
  storageProvider: row.storageProvider,
  createdAt: row.createdAt
});

class PostgresStore implements AppStore {
  readonly mode = "postgres" as const;
  private db = getDb();
  private demoReady = false;

  private database() {
    if (!this.db) throw new Error("DATABASE_URL is not configured");
    return this.db;
  }

  async ensureDemoData() {
    if (this.demoReady) return;
    const db = this.database();
    for (const account of demoAccounts) {
      const passwordHash = await bcrypt.hash(account.password, 10);
      await db.insert(users).values({
        id: account.id,
        email: account.email,
        name: account.name,
        passwordHash,
        role: account.role,
        demoAccountId: account.accountId
      }).onConflictDoNothing();
    }
    await db.insert(conversations).values({
      id: DEMO_SESSION_ID,
      advisorId: demoAccounts[0].id,
      clientId: demoAccounts[1].id,
      title: "Tan Li Wen - Hospitalisation clarity",
      joinCode: DEMO_JOIN_CODE,
      state: createDefaultSessionState()
    }).onConflictDoNothing();
    this.demoReady = true;
  }

  async getUserById(id: string) {
    const rows = await this.database().select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ? userRow(rows[0]) : null;
  }

  async getUserByEmail(email: string) {
    const rows = await this.database().select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);
    return rows[0] ? userRow(rows[0]) : null;
  }

  async getUserByDemoAccount(accountId: string) {
    const rows = await this.database().select().from(users).where(eq(users.demoAccountId, accountId)).limit(1);
    return rows[0] ? userRow(rows[0]) : null;
  }

  async createUser(input: Omit<AppUser, "id">) {
    const rows = await this.database().insert(users).values({ ...input, email: normalizeEmail(input.email) }).returning();
    return userRow(rows[0]);
  }

  private async documentsFor(sessionId: string) {
    const rows = await this.database().select().from(policyDocuments).where(eq(policyDocuments.conversationId, sessionId)).orderBy(desc(policyDocuments.createdAt));
    return rows.map(policySummary);
  }

  async listSessions(user: AppUser) {
    const predicate = user.role === "advisor" ? eq(conversations.advisorId, user.id) : eq(conversations.clientId, user.id);
    const rows = await this.database().select().from(conversations).where(predicate).orderBy(desc(conversations.updatedAt));
    return Promise.all(rows.map(async (row) => sessionRow(row, await this.documentsFor(row.id))));
  }

  async getSession(user: AppUser, sessionId?: string) {
    if (!sessionId) return (await this.listSessions(user))[0] || null;
    const access = or(eq(conversations.advisorId, user.id), eq(conversations.clientId, user.id));
    const rows = await this.database().select().from(conversations).where(and(eq(conversations.id, sessionId), access)).limit(1);
    return rows[0] ? sessionRow(rows[0], await this.documentsFor(rows[0].id)) : null;
  }

  async createSession(advisor: AppUser, title: string) {
    const rows = await this.database().insert(conversations).values({
      advisorId: advisor.id,
      title,
      joinCode: nanoid(8).toUpperCase(),
      state: createDefaultSessionState()
    }).returning();
    const session = sessionRow(rows[0]);
    await this.writeAudit({ conversationId: session.id, actorId: advisor.id, action: "session.created", metadata: {}, success: true });
    return session;
  }

  async joinSession(client: AppUser, joinCode: string) {
    const code = joinCode.trim().toUpperCase();
    const rows = await this.database().select().from(conversations).where(eq(conversations.joinCode, code)).limit(1);
    const row = rows[0];
    if (!row || (row.clientId && row.clientId !== client.id)) return null;
    const updated = await this.database().update(conversations).set({ clientId: client.id, version: row.version + 1, updatedAt: new Date() }).where(eq(conversations.id, row.id)).returning();
    await this.writeAudit({ conversationId: row.id, actorId: client.id, action: "session.joined", metadata: {}, success: true });
    return sessionRow(updated[0], await this.documentsFor(row.id));
  }

  async patchSession(user: AppUser, sessionId: string, patch: SessionPatch, action: string) {
    const current = await this.getSession(user, sessionId);
    if (!current) return null;
    const nextState = { ...current.state, ...patch };
    const rows = await this.database().update(conversations).set({ state: nextState, version: current.version + 1, updatedAt: new Date() }).where(eq(conversations.id, sessionId)).returning();
    await this.writeAudit({ conversationId: sessionId, actorId: user.id, action, metadata: { fields: Object.keys(patch) }, success: true });
    return sessionRow(rows[0], await this.documentsFor(sessionId));
  }

  async savePolicyDocument(input: Parameters<AppStore["savePolicyDocument"]>[0]) {
    const session = await this.getSession(input.user, input.sessionId);
    if (!session || input.user.role !== "advisor") return null;
    const rows = await this.database().insert(policyDocuments).values({
      conversationId: input.sessionId,
      uploadedBy: input.user.id,
      fileName: input.fileName,
      contentType: input.contentType,
      byteSize: input.byteSize,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey,
      pageCount: input.pages.length
    }).returning();
    if (input.pages.length) {
      await this.database().insert(policyPages).values(input.pages.map((page) => ({
        documentId: rows[0].id,
        pageNumber: page.pageNumber,
        content: page.content,
        searchText: page.content.toLowerCase()
      })));
    }
    await this.database().update(conversations).set({ version: session.version + 1, updatedAt: new Date() }).where(eq(conversations.id, session.id));
    await this.writeAudit({ conversationId: session.id, actorId: input.user.id, action: "policy.uploaded", metadata: { fileName: input.fileName, pages: input.pages.length }, success: true });
    return policySummary(rows[0]);
  }

  async searchPolicy(user: AppUser, sessionId: string, query: string) {
    const session = await this.getSession(user, sessionId);
    if (!session) return [];
    const rows = await this.database()
      .select({ page: policyPages, document: policyDocuments })
      .from(policyPages)
      .innerJoin(policyDocuments, eq(policyPages.documentId, policyDocuments.id))
      .where(eq(policyDocuments.conversationId, sessionId));
    return rows
      .map(({ page, document }) => ({
        id: page.id,
        documentId: document.id,
        fileName: document.fileName,
        pageNumber: page.pageNumber,
        quote: quoteFromPage(query, page.content),
        score: scorePage(query, page.searchText)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  async getPolicyDocument(user: AppUser, sessionId: string, documentId: string) {
    const session = await this.getSession(user, sessionId);
    if (!session) return null;
    const rows = await this.database().select().from(policyDocuments).where(and(
      eq(policyDocuments.id, documentId),
      eq(policyDocuments.conversationId, sessionId)
    )).limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      ...policySummary(row),
      conversationId: row.conversationId,
      uploadedBy: row.uploadedBy,
      contentType: row.contentType,
      storageKey: row.storageKey
    };
  }

  async writeAudit(event: Omit<AuditRecord, "id" | "createdAt">) {
    await this.database().insert(auditEvents).values(event);
  }

  async listAudit(user: AppUser, sessionId: string) {
    const session = await this.getSession(user, sessionId);
    if (!session || user.role !== "advisor") return [];
    const rows = await this.database().select().from(auditEvents).where(eq(auditEvents.conversationId, sessionId)).orderBy(desc(auditEvents.createdAt)).limit(100);
    return rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      actorId: row.actorId,
      action: row.action,
      metadata: row.metadata as Record<string, unknown>,
      success: row.success,
      createdAt: row.createdAt.toISOString()
    }));
  }

  async health() {
    try {
      await this.database().select({ id: users.id }).from(users).limit(1);
      return { configured: true, ok: true, mode: "postgres" };
    } catch (error) {
      return { configured: true, ok: false, mode: error instanceof Error ? error.message : "unavailable" };
    }
  }
}

let memoryStore: MemoryStore | null = null;
let postgresStore: PostgresStore | null = null;

export const getAppStore = (): AppStore => {
  if (process.env.DATABASE_URL) {
    postgresStore ||= new PostgresStore();
    return postgresStore;
  }
  memoryStore ||= new MemoryStore();
  return memoryStore;
};

export const resetMemoryStore = () => {
  memoryStore = new MemoryStore();
};
