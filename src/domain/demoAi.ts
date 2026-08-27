import type { ClientMessage, Recap } from "@/types/clarifi";

export const demoClientReply = (text: string) => {
  const lower = text.toLowerCase();
  if (lower.includes("work") || lower.includes("income") || lower.includes("bills")) {
    return {
      reply:
        "Your PRUShield Plus plan helps with eligible hospital bills, not your lost freelance income. So if you are warded, it can reimburse covered hospital and surgical charges, but it will not replace salary or project earnings while you recover.",
      detected: true,
      misunderstanding: "Hospital-bill cover is being mixed up with income replacement.",
      evidenceIds: ["C1", "C4"],
      understanding: [
        { point: "Hospital and surgical charges while warded can be reimbursed.", status: "covered" as const },
        { point: "Lost income from not being able to work is not paid by this plan.", status: "not_covered" as const },
        { point: "Ask the advisor how freelancers usually protect income gaps.", status: "action" as const }
      ],
      teachBack: "In your own words, what is the difference between hospital-bill cover and income replacement?"
    };
  }

  if (lower.includes("therapy") || lower.includes("mental")) {
    return {
      reply:
        "Outpatient counselling or therapy is not covered on its own under this demo policy. It may only be considered when it is directly tied to a covered inpatient admission.",
      detected: false,
      misunderstanding: "",
      evidenceIds: ["C5"],
      understanding: [
        { point: "Standalone outpatient counselling or therapy is not covered.", status: "not_covered" as const }
      ],
      teachBack: "What would need to happen before therapy could be linked to this hospitalisation plan?"
    };
  }

  return {
    reply:
      "The core cover is for eligible hospitalisation, ward, ICU, and surgical costs, plus related specialist tests around an eligible admission. It does not include every health cost, so exclusions like income loss, standalone outpatient mental health, and critical illness lump sums matter.",
    detected: false,
    misunderstanding: "",
    evidenceIds: ["C1", "C2", "C3", "C8"],
    understanding: [
      { point: "Eligible inpatient hospital and surgical costs are the core cover.", status: "covered" as const },
      { point: "Critical illness lump-sum benefit is not included in this plan.", status: "not_covered" as const }
    ],
    teachBack: "Which one thing is covered, and which one thing is not covered?"
  };
};

export const demoAdvisorReply = (text: string, clientMessages: ClientMessage[]) => {
  const hasIncomeConcern = clientMessages.some((message) => /income|work|bills/i.test(message.text));
  if (/gap|clarify|next/i.test(text) || hasIncomeConcern) {
    return {
      reply:
        "The biggest live gap is income protection: Li Wen may equate being insured with being financially protected while unable to work. Clarify that hospital bills and lost earnings are separate risks, then ask her to repeat the difference before moving to any product discussion.",
      citations: [
        { source: "Profile", quote: "28-year-old freelance designer" },
        { source: "Client session", quote: hasIncomeConcern ? "Concern about work, sickness, or bills appeared in the chat." : "No income concern has been directly confirmed yet." }
      ]
    };
  }

  return {
    reply:
      "Case summary: first-time freelancer with hospitalisation coverage who needs plain-language confirmation of what is covered, what is excluded, and what follow-up questions to ask. Keep the conversation evidence-led and avoid framing gaps as a sales pitch.",
    citations: [{ source: "Profile", quote: "First-time / early-stage insurance customer" }]
  };
};

export const demoRecap = (clientMessages: ClientMessage[]): Recap => {
  const points = clientMessages.flatMap((message) => message.understanding || []);
  return {
    covered: points.filter((point) => point.status === "covered").map((point) => point.point),
    notCovered: points.filter((point) => point.status === "not_covered").map((point) => point.point),
    followUps: points.filter((point) => point.status === "action").map((point) => point.point)
  };
};
