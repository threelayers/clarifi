import type { SessionState } from "./types.js";

export const DEMO_SESSION_ID = "00000000-0000-4000-8000-000000000101";
export const DEMO_JOIN_CODE = "LIWEN28";

export const createDefaultSessionState = (): SessionState => ({
  clientMessages: [
    {
      id: "client-welcome",
      role: "assistant",
      text: "Hi Li Wen, I'm ClariFi. I listen, read your notes, and help check clarity. Knowledge only; advice stays with your advisor/agent.",
      evidenceIds: [],
      understanding: [],
      createdAt: new Date(0).toISOString()
    }
  ],
  advisorMessages: [
    {
      id: "advisor-welcome",
      role: "assistant",
      text: "Private copilot for Li Wen. Ask for gaps, evidence, or what to clarify next. Human judgment stays with you.",
      citations: [],
      createdAt: new Date(0).toISOString()
    }
  ],
  clientNotes: "",
  sessionTranscript: "",
  handwrittenNoteImage: "",
  learningPoints: [],
  selectedCoverageIds: ["hospital-bills"],
  selectedDecisionIds: ["hospitalisation-foundation"],
  recap: null,
  recapApproved: false,
  preMeetingPrep: {
    advisorBrief: "First-time freelance customer. Separate hospital bills from income protection, then check what 'insured' means.",
    likelyConcerns: [
      "Hospital cover may be mistaken for income replacement.",
      "Outpatient mental health may be unclear.",
      "Critical illness lump-sum may be assumed."
    ],
    suggestedQuestions: [
      "Expected costs under 'insured'",
      "Income loss during hospitalisation",
      "Hospital bills vs income replacement"
    ],
    clientWidget: {
      title: "Today's clarity focus",
      bullets: ["Hospital bills", "Not income replacement", "Questions before next steps"]
    }
  }
});
