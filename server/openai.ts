import { clauses, clausesText, profile } from "./domain.js";

type OpenAIHistory = Array<{ role: "user" | "assistant"; content: string }>;

const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

type PromptContext = {
  clientNotes?: string;
  sessionTranscript?: string;
  handwrittenNoteImage?: string;
  policyEvidence?: string;
};

type ClientReply = {
  reply: string;
  detected: boolean;
  misunderstanding: string;
  evidenceIds: string[];
  understanding: Array<{ point: string; status: "covered" | "not_covered" | "action" }>;
  teachBack: string;
};

type AdvisorReply = {
  reply: string;
  citations: Array<{ source: string; quote: string }>;
};

type SessionRecap = {
  covered: string[];
  notCovered: string[];
  followUps: string[];
};

type PreMeetingPrep = {
  advisorBrief: string;
  likelyConcerns: string[];
  suggestedQuestions: string[];
  clientWidget: { title: string; bullets: string[] };
};

type JsonSchema = {
  type: "object";
  properties: Record<string, unknown>;
  required: string[];
  additionalProperties: false;
};

const adviceBoundary = `ClariFi is an educational clarity tool, not a financial adviser.
- Provide neutral, factual insurance knowledge and unbiased explanations only.
- Do not recommend whether the client should buy, cancel, upgrade, downgrade, switch, add, or choose any insurance product, rider, insurer, sum assured, premium level, or coverage amount.
- Do not say what the client "should do" as financial advice. Use neutral phrasing such as "you can ask your advisor/agent about..." or "one point to clarify with your agent is...".
- If the user asks for advice, suitability, recommendations, product choice, or what decision to make, politely state that ClariFi cannot give advice and direct them to the licensed human advisor/agent.
- You may explain concepts, policy wording, trade-offs in general terms, questions to ask, and what the provided policy clauses say.`;

const adviceIntentPattern =
  /\b(should i|should we|what should i|do you recommend|recommend|recommendation|advise|advice|best plan|better plan|which plan|which policy|buy|purchase|cancel|switch|upgrade|downgrade|add a rider|choose|worth it|suitable|right for me|need to get|must i get)\b/i;

const includesAdviceRequest = (history: OpenAIHistory) => adviceIntentPattern.test(history[history.length - 1]?.content || "");

const trimContext = (value = "", maxLength = 2800) => {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}\n[truncated for prompt length]`;
};

const sessionContextText = (context: PromptContext = {}) => {
  const clientNotes = trimContext(context.clientNotes);
  const sessionTranscript = trimContext(context.sessionTranscript, 5000);
  const hasHandwriting = Boolean(context.handwrittenNoteImage?.startsWith("data:image/"));
  const policyEvidence = trimContext(context.policyEvidence, 6000);

  return `Live session context:
- Client personal notes: ${clientNotes || "(none yet)"}
- Advisor/client speech transcript: ${sessionTranscript || "(none yet)"}
- Handwritten note image: ${hasHandwriting ? "attached for interpretation" : "(none yet)"}
- Retrieved uploaded-policy evidence: ${policyEvidence || "(none yet)"}

Use this context carefully:
- Treat client notes as signals about focus, interest, worry, and possible misunderstanding, not as policy facts.
- Treat handwriting as the client's subjective note-taking. If handwriting is unclear, say what is uncertain rather than guessing.
- Treat the speech transcript as a shared advisory conversation. Use speaker labels when present. If speaker identity is unclear, flag uncertainty instead of assuming.
- Use notes and transcript to prioritize explanations, learning points, and advisor follow-ups.`;
};

const cleanJson = <T>(raw: string): T => {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not parse model JSON");
    return JSON.parse(match[0]) as T;
  }
};

const extractOutputText = (data: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }> }) => {
  if (data.output_text) return data.output_text.trim();

  const text = (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => content.text || content.refusal || "")
    .join("")
    .trim();

  return text;
};

const callOpenAI = async (opts: {
  apiKey: string;
  model?: string;
  system: string;
  history: OpenAIHistory;
  schemaName: string;
  schema: JsonSchema;
  context?: PromptContext;
}) => {
  const handwritingInput = opts.context?.handwrittenNoteImage?.startsWith("data:image/")
    ? [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "The attached image is the client's handwritten note from the iPad writing pad. Interpret it only as client note-taking context; do not treat it as policy evidence."
            },
            {
              type: "input_image",
              image_url: opts.context.handwrittenNoteImage
            }
          ]
        }
      ]
    : [];

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: opts.model || DEFAULT_OPENAI_MODEL,
      input: [
        { role: "system", content: opts.system },
        ...handwritingInput,
        ...opts.history.map((message) => ({
          role: message.role,
          content: message.content
        }))
      ],
      text: {
        format: {
          type: "json_schema",
          name: opts.schemaName,
          strict: true,
          schema: opts.schema
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 260)}`);
  }

  const data = await response.json();
  const text = extractOutputText(data);
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
};

export const clientSystemPrompt = (context: PromptContext = {}) =>
  `You are ClariFi, an AI clarity copilot embedded in a Singapore College of Insurance advisory training session. You speak directly to ${profile.name}, a ${profile.age}-year-old ${profile.role} (${profile.stage}). Her current plan is ${profile.plan}.

${adviceBoundary}

Your one mission: make her truly understand what her insurance does and does not do. You are not a salesperson and not an adviser. Be warm, plain-spoken, concise, neutral, and explain jargon.

Follow Detect -> Explain -> Confirm:
- Detect when she may be confusing one thing for another, especially hospital-bill coverage with income replacement. If so, set detected=true and name the mix-up in misunderstanding.
- Explain what is covered and what is not.
- Keep reply compact: maximum 75 words, preferably 2-3 short bullets or one short paragraph.
- If she asks what decision to make or what product to buy/change, do not answer the advice request. Explain the relevant knowledge neutrally and tell her to discuss suitability or recommendations with her advisor/agent.
- Confirm with a short teach-back question in teachBack when useful.
- Ground every claim in her policy. evidenceIds must only contain real IDs from the list.
- understanding must contain concrete points she now understands, each with status covered, not_covered, or action. Keep each point under 12 words.
- Use the live session context to answer what the advisor just said, what the client wrote down, or what seems unclear. Do not invent from notes or transcript.

Policy clauses:
${clausesText()}

${sessionContextText(context)}

Return only JSON matching the schema.`;

export const advisorSystemPrompt = (clientTranscript: string, context: PromptContext = {}) =>
  `You are ClariFi's private advisor copilot, speaking to the financial representative, not the client. Help them serve ${profile.name} responsibly and keep the human in control. Be concise and practical.

${adviceBoundary}

Never draft pushy sales language. Do not recommend a product or decision on the advisor's behalf. Instead, provide neutral observations, explain possible knowledge gaps, and suggest questions the licensed advisor/agent can ask.
Keep replies scannable: maximum 5 short lines, no long paragraphs, and cite only the most useful evidence.

When relying on something the client said or her profile, add a citation with source and quote.

Client profile: ${profile.name}, ${profile.age}, ${profile.role}, ${profile.stage}. Plan: ${profile.plan}.
Known gaps: income protection, outpatient mental health, critical illness lump-sum, pre-existing waiting period.
Policy clauses:
${clausesText()}

Client and ClariFi chat so far:
${clientTranscript || "(no client conversation yet)"}

${sessionContextText(context)}

Return only JSON matching the schema.`;

const clientSchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    detected: { type: "boolean" },
    misunderstanding: { type: "string" },
    evidenceIds: {
      type: "array",
      items: { type: "string", enum: clauses.map((clause) => clause.id) }
    },
    understanding: {
      type: "array",
      items: {
        type: "object",
        properties: {
          point: { type: "string" },
          status: { type: "string", enum: ["covered", "not_covered", "action"] }
        },
        required: ["point", "status"],
        additionalProperties: false
      }
    },
    teachBack: { type: "string" }
  },
  required: ["reply", "detected", "misunderstanding", "evidenceIds", "understanding", "teachBack"],
  additionalProperties: false
};

const withAdviceRedirect = <T extends { reply?: string; detected?: boolean; misunderstanding?: string; understanding?: Array<{ point: string; status: string }>; teachBack?: string }>(
  result: T,
  history: OpenAIHistory
) => {
  if (!includesAdviceRequest(history)) return result;

  const redirect =
    "I can explain the policy wording and general insurance concepts, but I cannot tell you what to buy, change, cancel, or choose. Please discuss suitability and recommendations with your licensed advisor/agent.";

  const alreadyRedirects = /\b(cannot|can't|can’t|licensed advisor|advisor\/agent|human advisor|agent)\b/i.test(result.reply || "");

  return {
    ...result,
    detected: true,
    misunderstanding: result.misunderstanding || "This asks for advice or a recommendation, which ClariFi must route to the human advisor/agent.",
    reply: alreadyRedirects
      ? result.reply
      : `${redirect}\n\n${result.reply || ""}`.trim(),
    understanding: [
      ...(result.understanding || []),
      {
        point: "ClariFi provides neutral knowledge and policy clarification, while advice and suitability decisions must go to the licensed advisor/agent.",
        status: "action"
      }
    ],
    teachBack: result.teachBack || "What is the difference between policy knowledge and advice you should ask your advisor/agent for?"
  };
};

const normalizeClientReply = (result: ClientReply): ClientReply => ({
  ...result,
  understanding: result.understanding.map((item) => {
    const point = item.point.toLowerCase();
    if (/\b(ask|discuss|clarify|advisor|agent|next step|question)\b/.test(point)) {
      return { ...item, status: "action" };
    }
    if (/\b(does not|doesn't|not covered|not include|not included|no lump|excluded|exclusion|not pay|lost income|loss of income|salary|earnings)\b/.test(point)) {
      return { ...item, status: "not_covered" };
    }
    return item;
  })
});

const advisorSchema: JsonSchema = {
  type: "object",
  properties: {
    reply: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          quote: { type: "string" }
        },
        required: ["source", "quote"],
        additionalProperties: false
      }
    }
  },
  required: ["reply", "citations"],
  additionalProperties: false
};

const recapSchema: JsonSchema = {
  type: "object",
  properties: {
    covered: { type: "array", items: { type: "string" } },
    notCovered: { type: "array", items: { type: "string" } },
    followUps: { type: "array", items: { type: "string" } }
  },
  required: ["covered", "notCovered", "followUps"],
  additionalProperties: false
};

const preMeetingSchema: JsonSchema = {
  type: "object",
  properties: {
    advisorBrief: { type: "string" },
    likelyConcerns: { type: "array", items: { type: "string" } },
    suggestedQuestions: { type: "array", items: { type: "string" } },
    clientWidget: {
      type: "object",
      properties: {
        title: { type: "string" },
        bullets: { type: "array", items: { type: "string" } }
      },
      required: ["title", "bullets"],
      additionalProperties: false
    }
  },
  required: ["advisorBrief", "likelyConcerns", "suggestedQuestions", "clientWidget"],
  additionalProperties: false
};

export const generateClientReply = async (apiKey: string, history: OpenAIHistory, model?: string, context: PromptContext = {}) =>
  withAdviceRedirect(
    normalizeClientReply(
      cleanJson<ClientReply>(
        await callOpenAI({
          apiKey,
          model,
          history,
          schemaName: "clarifi_client_reply",
          schema: clientSchema,
          system: clientSystemPrompt(context),
          context
        })
      )
    ),
    history
  );

export const generateAdvisorReply = async (
  apiKey: string,
  history: OpenAIHistory,
  transcript: string,
  model?: string,
  context: PromptContext = {}
) =>
  cleanJson<AdvisorReply>(
    await callOpenAI({
      apiKey,
      model,
      history,
      schemaName: "clarifi_advisor_reply",
      schema: advisorSchema,
      system: advisorSystemPrompt(transcript, context),
      context
    })
  );

export const generateSessionRecap = async (apiKey: string, transcript: string, model?: string, context: PromptContext = {}) => {
  const system = `Produce a concise ClariFi session recap for an advisory audit trail. Use plain language and short bullet phrases. Base it only on the conversation and policy.

${adviceBoundary}

Do not frame follow-ups as product recommendations. Follow-ups must be neutral clarification items to discuss with the licensed advisor/agent.

Policy:
${clausesText()}

${sessionContextText(context)}`;

  return cleanJson<SessionRecap>(
    await callOpenAI({
      apiKey,
      model,
      schemaName: "clarifi_session_recap",
      schema: recapSchema,
      system,
      context,
      history: [{ role: "user", content: transcript }]
    })
  );
};

export const generatePreMeetingPrep = async (apiKey: string, model?: string) => {
  const system = `You are ClariFi's pre-meeting preparation copilot for a Singapore College of Insurance advisory training session.

${adviceBoundary}

Prepare the advisor before meeting ${profile.name}. Use the client profile and policy clauses only. Do not sell or recommend a product. Focus on likely misunderstandings, neutral knowledge gaps, follow-up coverage topics, and a short client-facing focus widget that makes the session feel safe and clear.

The suggestedQuestions field is displayed as "Follow-up coverage" in the advisor dashboard. Do not write full scripted questions there. Write concise topic or coverage-move labels instead, such as "Income loss during warding" or "MediShield Life vs private shield layer". These topics should help the advisor decide what to cover next without undermining the advisor's own delivery.

Client profile: ${profile.name}, ${profile.age}, ${profile.role}, ${profile.stage}. Current plan: ${profile.plan}.

Policy clauses:
${clausesText()}

Return only JSON matching the schema. Keep every list item concise.`;

  return cleanJson<PreMeetingPrep>(
    await callOpenAI({
      apiKey,
      model,
      schemaName: "clarifi_pre_meeting_prep",
      schema: preMeetingSchema,
      system,
      history: [{ role: "user", content: "Generate pre-meeting preparation for this advisory session." }]
    })
  );
};
