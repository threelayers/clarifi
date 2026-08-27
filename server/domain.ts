export type UnderstandingStatus = "covered" | "not_covered" | "action";

export type ClientUnderstanding = {
  point: string;
  status: UnderstandingStatus;
};

export type PolicyClause = {
  id: string;
  code: string;
  title: string;
  full: string;
  highlight: string;
};

export const profile = {
  name: "Tan Li Wen",
  age: 28,
  role: "Freelance Designer",
  stage: "First-time / early-stage insurance customer",
  plan: "PRUShield Plus (Hospitalisation & Surgical)"
};

export const clauses: PolicyClause[] = [
  {
    id: "C1",
    code: "S2.1",
    title: "Hospitalisation & Surgical Benefit",
    full: "The policy reimburses medically necessary hospitalisation, ward, and surgical charges while warded, up to the plan limit and subject to the deductible and co-insurance.",
    highlight: "reimburses medically necessary hospitalisation, ward, and surgical charges while warded"
  },
  {
    id: "C2",
    code: "S2.3",
    title: "Intensive Care Benefit",
    full: "Charges for treatment in an intensive care unit are covered as part of an eligible inpatient admission, within the annual claim limit.",
    highlight: "treatment in an intensive care unit are covered as part of an eligible inpatient admission"
  },
  {
    id: "C3",
    code: "S2.5",
    title: "Pre- and Post-Hospitalisation",
    full: "Specialist consultations and diagnostic tests within 90 days before and after an eligible admission are covered when directly related to it.",
    highlight: "within 90 days before and after an eligible admission are covered"
  },
  {
    id: "C4",
    code: "S5.2",
    title: "Exclusion - Loss of Income",
    full: "This policy does not provide any benefit for loss of income, salary, or earnings arising from an inability to work due to illness or injury.",
    highlight: "does not provide any benefit for loss of income, salary, or earnings arising from an inability to work"
  },
  {
    id: "C5",
    code: "S5.4",
    title: "Exclusion - Outpatient Mental Health",
    full: "Outpatient psychiatric treatment, counselling, and therapy are not covered unless they arise directly from a covered inpatient admission.",
    highlight: "Outpatient psychiatric treatment, counselling, and therapy are not covered"
  },
  {
    id: "C6",
    code: "S5.1",
    title: "Exclusion - Pre-existing Conditions",
    full: "Conditions that existed before the policy start date are not covered unless declared, accepted, and past the stated waiting period.",
    highlight: "Conditions that existed before the policy start date are not covered"
  },
  {
    id: "C7",
    code: "S3.2",
    title: "Deductible & Co-insurance",
    full: "The policyholder pays an annual deductible plus 10% co-insurance on eligible claims before benefits apply, unless a rider reduces this.",
    highlight: "an annual deductible plus 10% co-insurance on eligible claims"
  },
  {
    id: "C8",
    code: "S4.0",
    title: "Critical Illness - Not Included",
    full: "No lump-sum critical illness benefit is included under this hospitalisation plan; it must be added as a separate rider or policy.",
    highlight: "No lump-sum critical illness benefit is included under this hospitalisation plan"
  }
];

export const clausesText = () =>
  clauses.map((clause) => `[${clause.id} | ${clause.code} ${clause.title}] ${clause.full}`).join("\n");
