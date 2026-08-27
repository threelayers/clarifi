import type { AdvisorMessage, ClientMessage, PreMeetingPrep } from "@/types/clarifi";

export type ClariFiView = "client" | "advisor";

export const DEFAULT_MODEL = "gpt-5.4-mini";
export const DEFAULT_COVERAGE_IDS = ["hospital-bills"];
export const DEFAULT_DECISION_IDS = ["hospitalisation-foundation"];

export const initialClientMessage: ClientMessage = {
  id: "client-welcome",
  role: "assistant",
  text:
    "Hi Li Wen, I'm ClariFi. I listen, read your notes, and help check clarity. Knowledge only; advice stays with your advisor/agent.",
  evidenceIds: [],
  understanding: []
};

export const initialAdvisorMessage: AdvisorMessage = {
  id: "advisor-welcome",
  role: "assistant",
  text:
    "Private copilot for Li Wen. Ask for gaps, evidence, or what to clarify next. Human judgment stays with you.",
  citations: []
};

export const defaultPreMeetingPrep: PreMeetingPrep = {
  advisorBrief:
    "First-time freelance customer. Separate hospital bills from income protection, then check what 'insured' means.",
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
};
