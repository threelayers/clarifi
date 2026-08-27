import type { CoverageItem, DecisionOption, MyInfoSection } from "@/types/clarifi";

export const myInfoSections: MyInfoSection[] = [
  {
    title: "Personal particulars",
    fields: [
      { label: "Name", value: "Tan Li Wen", source: "MyInfo" },
      { label: "Age", value: "28", source: "MyInfo" },
      { label: "Residential status", value: "Singapore citizen", source: "MyInfo" }
    ]
  },
  {
    title: "Family, work, income",
    fields: [
      { label: "Marital status", value: "Single", source: "MyInfo" },
      { label: "Employment", value: "Self-employed designer", source: "Declared" },
      { label: "Income pattern", value: "Variable freelance income", source: "Declared" }
    ]
  },
  {
    title: "Housing, education, CPF",
    fields: [
      { label: "Housing", value: "Rents with family support", source: "Declared" },
      { label: "Education", value: "Diploma / design training", source: "MyInfo" },
      { label: "CPF signal", value: "Irregular self-employed contributions", source: "CPF" }
    ]
  }
];

export const coverageItems: CoverageItem[] = [
  {
    id: "hospital-bills",
    label: "Hospital bills explained",
    signal: "Eligible inpatient bills separated from other money needs.",
    source: "Policy clauses S1.2, S2.1",
    tone: "green"
  },
  {
    id: "income-risk",
    label: "Income loss separated",
    signal: "Freelance income risk is a separate clarification point.",
    source: "MyInfo employment + session notes",
    tone: "red"
  },
  {
    id: "critical-illness",
    label: "Critical illness checked",
    signal: "Client may expect a lump-sum payout.",
    source: "Known gap + clause S4.0",
    tone: "amber"
  },
  {
    id: "outpatient-mental-health",
    label: "Mental health boundary",
    signal: "Therapy or counselling may need separate clarification.",
    source: "Known gap + clause S5.4",
    tone: "amber"
  },
  {
    id: "pre-existing",
    label: "Pre-existing wait period",
    signal: "Confirm any condition before policy start.",
    source: "Clause S5.1",
    tone: "amber"
  },
  {
    id: "affordability",
    label: "Affordability / CPF context",
    signal: "Ground discussion in variable income and CPF pattern.",
    source: "MyInfo/CPF snapshot",
    tone: "green"
  }
];

export const decisionOptions: DecisionOption[] = [
  {
    id: "hospitalisation-foundation",
    title: "Hospitalisation foundation",
    category: "Current plan discussion",
    linkedNeeds: ["Medical bill reimbursement", "MediShield Life/private shield clarity"],
    effects: ["Eligible inpatient charges", "Anchored to policy wording"],
    limitations: ["No income replacement", "No critical illness lump-sum"],
    clientSummary:
      "This path focuses on understanding how hospital bills are handled, what the plan can pay for, and which costs still need clarification with the advisor."
  },
  {
    id: "income-protection-gap",
    title: "Income protection gap",
    category: "Gap to clarify",
    linkedNeeds: ["Variable freelance income", "Bills during recovery or no-work periods"],
    effects: ["Separates income risk", "Frames neutral questions"],
    limitations: ["No product recommendation", "Suitability stays with advisor"],
    clientSummary:
      "This path separates hospital bill cover from money needed while not working, so the client and advisor can discuss the gap clearly."
  },
  {
    id: "critical-illness-rider",
    title: "Critical illness lump-sum check",
    category: "Rider / separate policy discussion",
    linkedNeeds: ["Fear of serious illness", "Need for cash support beyond hospital bills"],
    effects: ["Separate lump-sum topic", "Avoids false assumption"],
    limitations: ["No rider recommendation", "Amount needs advisor judgment"],
    clientSummary:
      "This path checks whether the client expected a lump-sum payout and routes any suitability discussion back to the advisor."
  },
  {
    id: "mental-health-boundary",
    title: "Outpatient mental health boundary",
    category: "Coverage boundary",
    linkedNeeds: ["Therapy or counselling questions", "Standalone outpatient support"],
    effects: ["Plain-language boundary", "Clear close-out point"],
    limitations: ["Standalone outpatient not included here", "Alternatives require advisor"],
    clientSummary:
      "This path makes the mental health boundary explicit, so the client knows what to ask the advisor before relying on the plan."
  }
];
