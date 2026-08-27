import type {
  AdvisorMessage,
  AuthUser,
  ClientMessage,
  DemoAccount,
  PolicyDocumentSummary,
  PolicyEvidence,
  PreMeetingPrep,
  Recap,
  SessionRecord,
  SessionSummary,
  SessionState
} from "@/types/clarifi";

type ApiConfig = {
  model: string;
};

type SessionContext = {
  sessionId?: string;
  clientNotes?: string;
  sessionTranscript?: string;
  handwrittenNoteImage?: string;
};

const requestJson = async <T>(path: string, body: Record<string, unknown>, config: ApiConfig): Promise<T> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };

  const response = await fetch(path, {
    method: "POST",
    headers,
    credentials: "same-origin",
    body: JSON.stringify({ ...body, model: config.model })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const sendClientMessage = (messages: ClientMessage[], config: ApiConfig, context: SessionContext = {}) =>
  requestJson<{
    reply: string;
    detected: boolean;
    misunderstanding?: string;
    evidenceIds: string[];
    understanding: Array<{ point: string; status: "covered" | "not_covered" | "action" }>;
    teachBack?: string;
    documentEvidence?: PolicyEvidence[];
  }>(
    "/api/chat/client",
    {
      history: messages.map((message) => ({ id: message.id, role: message.role, content: message.text })),
      sessionId: context.sessionId,
      clientNotes: context.clientNotes || "",
      sessionTranscript: context.sessionTranscript || "",
      handwrittenNoteImage: context.handwrittenNoteImage || ""
    },
    config
  );

export const sendAdvisorMessage = (
  messages: AdvisorMessage[],
  clientMessages: ClientMessage[],
  config: ApiConfig,
  context: SessionContext = {}
) =>
  requestJson<{ reply: string; citations?: Array<{ source: string; quote: string }>; documentEvidence?: PolicyEvidence[] }>(
    "/api/chat/advisor",
    {
      history: messages.map((message) => ({ id: message.id, role: message.role, content: message.text })),
      sessionId: context.sessionId,
      clientTranscript: clientMessages
        .map((message) => `${message.role === "user" ? "Client" : "ClariFi"}: ${message.text}`)
        .join("\n"),
      clientNotes: context.clientNotes || "",
      sessionTranscript: context.sessionTranscript || "",
      handwrittenNoteImage: context.handwrittenNoteImage || ""
    },
    config
  );

export const requestRecap = (clientMessages: ClientMessage[], config: ApiConfig, context: SessionContext = {}) =>
  requestJson<Recap>(
    "/api/recap",
    {
      transcript: clientMessages
        .map((message) => `${message.role === "user" ? "Client" : "ClariFi"}: ${message.text}`)
        .join("\n"),
      sessionId: context.sessionId,
      clientNotes: context.clientNotes || "",
      sessionTranscript: context.sessionTranscript || "",
      handwrittenNoteImage: context.handwrittenNoteImage || ""
    },
    config
  );

export const requestPreMeetingPrep = (config: ApiConfig, sessionId?: string) =>
  requestJson<PreMeetingPrep>("/api/premeeting", { sessionId }, config);

const authJson = async <T>(path: string, options: RequestInit = {}) => {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const getDemoAccounts = () =>
  authJson<{ accounts: DemoAccount[] }>("/api/auth/demo-accounts");

export const getCurrentUser = () =>
  authJson<{ user: AuthUser }>("/api/auth/me", { method: "GET" });

type DemoLoginPayload = string | { accountId?: string; email?: string; password?: string };

export const loginDemoAccount = (payload: DemoLoginPayload = "advisor-demo") =>
  authJson<{ user: AuthUser; token: string; sessionMode: string }>(typeof payload === "string" || "accountId" in payload ? "/api/auth/demo-login" : "/api/auth/login", {
    method: "POST",
    body: JSON.stringify(typeof payload === "string" ? { accountId: payload } : payload)
  });

export const logout = () =>
  authJson<{ ok: boolean }>("/api/auth/logout", { method: "POST" });

export const getCurrentSession = () =>
  authJson<{ session: SessionRecord; persistenceMode: "postgres" | "memory" }>("/api/sessions/current", { method: "GET" });

export const listSessions = () =>
  authJson<{ sessions: SessionSummary[]; persistenceMode: "postgres" | "memory" }>("/api/sessions", { method: "GET" });

export const getSession = (sessionId: string) =>
  authJson<{ session: SessionRecord; persistenceMode: "postgres" | "memory" }>(`/api/sessions/${sessionId}`, { method: "GET" });

export const patchSessionState = (sessionId: string, patch: Partial<SessionState>) =>
  authJson<{ session: SessionRecord }>(`/api/sessions/${sessionId}/state`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });

export const createSession = (title: string) =>
  authJson<{ session: SessionRecord }>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({ title })
  });

export const joinSession = (joinCode: string) =>
  authJson<{ session: SessionRecord }>("/api/sessions/join", {
    method: "POST",
    body: JSON.stringify({ joinCode })
  });

export const uploadPolicyDocument = async (sessionId: string, file: File) => {
  const form = new FormData();
  form.append("policy", file);
  const response = await fetch(`/api/policies/${sessionId}/upload`, {
    method: "POST",
    credentials: "same-origin",
    body: form
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `Upload failed with ${response.status}`);
  }
  return response.json() as Promise<{ document: PolicyDocumentSummary }>;
};

export const searchPolicyDocument = (sessionId: string, query: string) =>
  authJson<{ evidence: PolicyEvidence[] }>(`/api/policies/${sessionId}/search?q=${encodeURIComponent(query)}`, { method: "GET" });
