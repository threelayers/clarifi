export type UserRole = "advisor" | "client";

export type AppUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  demoAccountId?: string | null;
};

export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  detected?: boolean;
  misunderstanding?: string;
  evidenceIds?: string[];
  teachBack?: string;
  understanding?: Array<{ point: string; status: "covered" | "not_covered" | "action" }>;
  citations?: Array<{ source: string; quote: string }>;
};

export type PolicyEvidence = {
  id: string;
  documentId: string;
  fileName: string;
  pageNumber: number;
  quote: string;
  score: number;
};

export type PolicyDocumentSummary = {
  id: string;
  fileName: string;
  byteSize: number;
  pageCount: number;
  storageProvider: "vercel-blob" | "s3" | "memory";
  createdAt: string;
};

export type SessionState = {
  clientMessages: SessionMessage[];
  advisorMessages: SessionMessage[];
  clientNotes: string;
  sessionTranscript: string;
  handwrittenNoteImage: string;
  learningPoints: Array<{ point: string; status: "covered" | "not_covered" | "action" }>;
  selectedCoverageIds: string[];
  selectedDecisionIds: string[];
  recap: { covered: string[]; notCovered: string[]; followUps: string[] } | null;
  recapApproved: boolean;
  preMeetingPrep: {
    advisorBrief: string;
    likelyConcerns: string[];
    suggestedQuestions: string[];
    clientWidget: { title: string; bullets: string[] };
  };
};

export type SessionRecord = {
  id: string;
  advisorId: string;
  clientId: string | null;
  title: string;
  joinCode: string;
  status: "active" | "closed";
  state: SessionState;
  version: number;
  createdAt: string;
  updatedAt: string;
  policyDocuments: PolicyDocumentSummary[];
};

export type AuditRecord = {
  id: string;
  conversationId: string | null;
  actorId: string | null;
  action: string;
  metadata: Record<string, unknown>;
  success: boolean;
  createdAt: string;
};
