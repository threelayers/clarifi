import type { PreMeetingPrep, Recap } from "../src/types/clarifi.js";

type HistoryMessage = { role: "user" | "assistant"; content: string };

const lastUserText = (history: HistoryMessage[]) =>
  [...history].reverse().find((message) => message.role === "user")?.content || "";

export const demoClientReply = (history: HistoryMessage[]) => {
  const lower = lastUserText(history).toLowerCase();
  if (lower.includes("work") || lower.includes("income") || lower.includes("bills")) {
    return {
      reply:
        "Hospital cover helps with eligible inpatient bills, not lost freelance income. Ask your advisor how income gaps are handled.",
      detected: true,
      misunderstanding: "Hospital-bill cover may be mixed up with income replacement.",
      evidenceIds: ["C1", "C4"],
      understanding: [
        { point: "Hospital bills can be reimbursed.", status: "covered" as const },
        { point: "Lost income is separate.", status: "not_covered" as const },
        { point: "Clarify income protection with advisor.", status: "action" as const }
      ],
      teachBack: "What is the difference between hospital-bill cover and income replacement?"
    };
  }

  if (lower.includes("therapy") || lower.includes("mental")) {
    return {
      reply:
        "Standalone outpatient counselling or therapy is not treated as covered here. Clarify exceptions with your advisor.",
      detected: false,
      misunderstanding: "",
      evidenceIds: ["C5"],
      understanding: [
        { point: "Standalone outpatient therapy is not covered.", status: "not_covered" as const },
        { point: "Clarify any exception with advisor.", status: "action" as const }
      ],
      teachBack: "When would you ask the advisor to clarify mental health coverage?"
    };
  }

  return {
    reply:
      "The core cover is eligible hospitalisation, ward, ICU, and surgical costs. It does not cover every money need.",
    detected: false,
    misunderstanding: "",
    evidenceIds: ["C1", "C2", "C3"],
    understanding: [
      { point: "Hospitalisation costs are the core cover.", status: "covered" as const },
      { point: "Some money needs are separate.", status: "action" as const }
    ],
    teachBack: "Name one thing covered and one thing to clarify."
  };
};

export const demoAdvisorReply = (history: HistoryMessage[], clientTranscript: string) => {
  const prompt = lastUserText(history);
  const hasIncomeConcern = /income|work|bills/i.test(`${prompt}\n${clientTranscript}`);
  if (/decision|summary|confirm|wants|gap|clarify|next/i.test(prompt) || hasIncomeConcern) {
    return {
      reply:
        "Client signal: hospital bills vs income risk. Decision path: hospitalisation foundation. Clarify whether she expects cash support while not working.",
      citations: [
        { source: "Profile", quote: "28-year-old freelance designer" },
        { source: "Session", quote: hasIncomeConcern ? "Income, work, or bills appeared in the discussion." : "No income concern directly confirmed yet." }
      ]
    };
  }

  return {
    reply:
      "Case snapshot: first-time freelancer, hospitalisation cover, likely confusion around what is paid and what remains outside the plan.",
    citations: [{ source: "Profile", quote: "First-time / early-stage insurance customer" }]
  };
};

export const demoRecap = (transcript: string): Recap => {
  const incomeConcern = /income|work|bills/i.test(transcript);
  return {
    covered: ["Hospitalisation costs are the core cover."],
    notCovered: incomeConcern ? ["Lost freelance income is not paid by the hospital plan."] : ["Critical illness lump-sum is not included in the hospital plan."],
    followUps: [incomeConcern ? "Clarify income protection with advisor." : "Ask advisor which gaps still matter."]
  };
};

export const demoPreMeetingPrep = (): PreMeetingPrep => ({
  advisorBrief: "First-time freelancer. Separate hospital bills from income protection.",
  likelyConcerns: ["Income loss may be confused with hospital bills.", "Critical illness lump-sum may be assumed.", "Mental health boundary may need clarity."],
  suggestedQuestions: ["Hospital bills vs income", "MediShield layer", "Critical illness assumption"],
  clientWidget: {
    title: "Today's clarity focus",
    bullets: ["Hospital bills", "Income gap", "Questions before next steps"]
  }
});
