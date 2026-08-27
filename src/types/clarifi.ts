export type Role = "user" | "assistant";

export type UnderstandingStatus = "covered" | "not_covered" | "action";

export type Understanding = {
  point: string;
  status: UnderstandingStatus;
};

export type ClientMessage = {
  id: string;
  role: Role;
  text: string;
  createdAt?: string;
  detected?: boolean;
  misunderstanding?: string;
  evidenceIds?: string[];
  teachBack?: string;
  understanding?: Understanding[];
};

export type Citation = {
  source: string;
  quote: string;
};

export type AdvisorMessage = {
  id: string;
  role: Role;
  text: string;
  createdAt?: string;
  citations?: Citation[];
};

export type Recap = {
  covered: string[];
  notCovered: string[];
  followUps: string[];
};

export type PreMeetingPrep = {
  advisorBrief: string;
  likelyConcerns: string[];
  suggestedQuestions: string[];
  clientWidget: {
    title: string;
    bullets: string[];
  };
};

export type PolicyClause = {
  id: string;
  code: string;
  title: string;
  full: string;
  highlight: string;
};

export type MyInfoField = {
  label: string;
  value: string;
  source: "MyInfo" | "CPF" | "Declared";
};

export type MyInfoSection = {
  title: string;
  fields: MyInfoField[];
};

export type CoverageItem = {
  id: string;
  label: string;
  signal: string;
  source: string;
  tone: "green" | "amber" | "red";
};

export type DecisionOption = {
  id: string;
  title: string;
  category: string;
  linkedNeeds: string[];
  effects: string[];
  limitations: string[];
  clientSummary: string;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "advisor" | "client";
};

export type DemoAccount = AuthUser & {
  accountId: string;
  label: string;
  description: string;
};

export type PolicyDocumentSummary = {
  id: string;
  fileName: string;
  byteSize: number;
  pageCount: number;
  storageProvider: "vercel-blob" | "s3" | "memory";
  createdAt: string;
};

export type PolicyEvidence = {
  id: string;
  documentId: string;
  fileName: string;
  pageNumber: number;
  quote: string;
  score: number;
};

export type SessionState = {
  clientMessages: ClientMessage[];
  advisorMessages: AdvisorMessage[];
  clientNotes: string;
  sessionTranscript: string;
  handwrittenNoteImage: string;
  learningPoints: Understanding[];
  selectedCoverageIds: string[];
  selectedDecisionIds: string[];
  recap: Recap | null;
  recapApproved: boolean;
  preMeetingPrep: PreMeetingPrep;
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

export type SessionSummary = Pick<SessionRecord, "id" | "title" | "status" | "joinCode" | "version" | "updatedAt">;
