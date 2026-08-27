import { Check, ClipboardCheck, Database, FileSearch, FileText, ListChecks, LoaderCircle, Mic, Search, Send, Sparkles, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clauses, profile } from "@/domain/policy";
import { ClariFiAiMark } from "@/shared/components/ClariFiAiMark";
import { EmptyState, LoadingDots } from "@/shared/components/Header";
import { compactText } from "@/shared/lib/text";
import type { AdvisorMessage, CoverageItem, DecisionOption, MyInfoSection, PolicyDocumentSummary, PolicyEvidence, PreMeetingPrep, Recap } from "@/types/clarifi";

type AdvisorViewProps = {
  messages: AdvisorMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  recap: Recap | null;
  recapLoading: boolean;
  recapApproved: boolean;
  onGenerateRecap: () => void;
  onApproveRecap: () => void;
  preMeetingPrep: PreMeetingPrep;
  preMeetingLoading: boolean;
  onGeneratePreMeeting: () => void;
  myInfoSections: MyInfoSection[];
  coverageItems: CoverageItem[];
  selectedCoverageIds: string[];
  onToggleCoverage: (id: string) => void;
  decisionOptions: DecisionOption[];
  selectedDecisionIds: string[];
  onToggleDecision: (id: string) => void;
  policyDocuments: PolicyDocumentSummary[];
  policyEvidence: PolicyEvidence[];
  policyUploading: boolean;
  policyError: string;
  onPolicyFile: (file: File) => void;
  onPolicySearch: (query: string) => void;
  sessionId: string;
};

export function AdvisorView(props: AdvisorViewProps) {
  const [input, setInput] = useState("");
  const [policyQuery, setPolicyQuery] = useState("income hospital");
  const scrollRef = useRef<HTMLDivElement>(null);
  const followUpTopics = useMemo(
    () => props.preMeetingPrep.suggestedQuestions.slice(0, 3).map((item) => coverageTopicFrom(item)),
    [props.preMeetingPrep.suggestedQuestions]
  );
  const policyResults = useMemo(() => searchPolicy(policyQuery), [policyQuery]);
  const selectedDecisionOptions = useMemo(
    () => props.decisionOptions.filter((option) => props.selectedDecisionIds.includes(option.id)),
    [props.decisionOptions, props.selectedDecisionIds]
  );

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [props.messages, props.loading]);

  const send = (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    props.onSend(trimmed);
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="apple-rail hidden w-[300px] shrink-0 border-r xl:flex xl:min-h-0 xl:flex-col">
        <div className="shrink-0 border-b border-line bg-white/45 p-5 pb-4 text-lg font-semibold tracking-tight backdrop-blur-xl">Advisor dashboard</div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <div className="apple-panel-quiet mb-4 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sci text-sm font-bold text-white">TL</div>
              <div>
                <div className="text-sm font-semibold text-ink">{profile.name}</div>
                <div className="text-xs font-medium text-[#6E6E73]">{profile.role}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {["First-time", "Freelance", "Hospital cover", "Income risk"].map((item) => (
                <span key={item} className="apple-chip text-[10.5px]">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="apple-panel-quiet mb-4 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#248A3D]">
                <Database size={14} /> MyInfo import
              </div>
              <span className="rounded-md border border-[#CDEDD6] bg-[#F2FBF5] px-2 py-1 text-[10px] font-bold text-[#248A3D]">Demo</span>
            </div>
            <div className="space-y-3">
              {props.myInfoSections.map((section) => (
                <div key={section.title}>
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">{section.title}</div>
                  <div className="space-y-1">
                    {section.fields.map((field) => (
                      <div key={`${section.title}-${field.label}`} className="rounded-md border border-[#E5E5EA] bg-white/58 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[#3A3A3C]">{field.label}</span>
                          <span className="text-[9px] font-bold uppercase tracking-wide text-[#248A3D]">{field.source}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] font-medium leading-4 text-[#6E6E73]" title={field.value}>
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="apple-panel-quiet mb-4 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-sci">
                <ClipboardCheck size={14} /> Pre-meeting prep
              </div>
              <button
                className="rounded-md border border-[#CFE7FF] bg-[#F3F9FF] px-2 py-1 text-[11px] font-semibold text-sci hover:border-sci hover:bg-white disabled:cursor-wait disabled:opacity-60"
                onClick={props.onGeneratePreMeeting}
                disabled={props.preMeetingLoading}
              >
                {props.preMeetingLoading ? "Preparing..." : "Refresh"}
              </button>
            </div>
            <p className="mb-3 text-xs font-medium leading-5 text-[#3A3A3C]" title={props.preMeetingPrep.advisorBrief}>
              {compactText(props.preMeetingPrep.advisorBrief, 118)}
            </p>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-sci">
              <ListChecks size={13} /> Follow-up coverage
            </div>
            <div className="space-y-2">
              {followUpTopics.map((topic, index) => (
                <div
                  key={`${topic}-${index}`}
                  className="w-full rounded-md border border-[#E5E5EA] bg-white/58 px-3 py-2 text-left"
                >
                  <div className="text-xs font-semibold leading-5 text-[#1D1D1F]">{topic}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="apple-panel-quiet p-4">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#B25000]">Likely gaps</div>
            {props.preMeetingPrep.likelyConcerns.slice(0, 4).map((item) => (
              <div key={item} className="mb-2 rounded-md border border-[#FFE0B2] bg-[#FFF8EE] px-3 py-2 text-xs font-medium text-[#3A3A3C]" title={item}>
                {compactText(item, 72)}
              </div>
            ))}
          </div>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col bg-paper">
        <div className="flex shrink-0 items-center gap-3 border-b border-line bg-white/72 px-6 py-3 shadow-[0_10px_40px_rgba(0,0,0,.04)] backdrop-blur-2xl">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white/58 text-sci backdrop-blur-xl">
            <Mic size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-ink">Private advisor copilot</div>
            <div className="text-xs font-medium text-[#6E6E73]">Knowledge support only</div>
          </div>
          <span className="apple-chip ml-auto">
            Advisor stays in control
          </span>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-[660px]">
            {props.messages.map((message) => (
              <div key={message.id} className={`mb-5 flex items-start ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <ClariFiAiMark tone="dark" className="mr-3 mt-1" />
                )}
                <div className={`flex max-w-[560px] flex-col gap-2 ${message.role === "user" ? "items-end" : ""}`}>
                  {message.role === "assistant" ? <AdvisorInsightText text={message.text} /> : <div className="advisor-user-bubble">{message.text}</div>}
                  {(message.citations || []).length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39C95]">Cited from session</span>
                      {(message.citations || []).map((citation, index) => (
                        <div key={`${citation.source}-${index}`} className="rounded-lg border border-[#E5E5EA] bg-white/78 px-3 py-2 shadow-[0_10px_32px_rgba(0,0,0,.045)] backdrop-blur-xl">
                          <div className="mb-1 text-[10px] font-bold text-sci">{citation.source}</div>
                          <div className="text-xs italic leading-5 text-[#5A554F]">"{citation.quote}"</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {props.loading && (
              <div className="mb-5 flex items-center">
                <ClariFiAiMark tone="dark" className="mr-3" />
                <LoadingDots dark />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 px-6 pb-5 pt-3">
          <div className="mx-auto max-w-[660px]">
            <div className="mb-3 flex flex-wrap gap-2">
              {["Case summary", "Coverage gaps", "Clarify next", "Teach-back question"].map((suggestion) => (
                <button key={suggestion} className="suggestion" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-3 rounded-lg border border-[#D2D2D7] bg-white/80 py-2 pl-4 pr-2 shadow-[0_18px_55px_rgba(0,0,0,.08)] backdrop-blur-2xl">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder="Ask about the client, gaps, or what to clarify next..."
                className="max-h-[120px] flex-1 resize-none border-none bg-transparent py-2 text-[14.5px] leading-6 outline-none"
              />
              <button className="send-button bg-ink hover:bg-black" onClick={() => send()} aria-label="Send advisor message">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="apple-rail hidden w-[390px] shrink-0 flex-col border-l lg:flex">
        <div className="border-b border-line bg-white/45 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="text-base font-semibold tracking-tight">Advisor action rail</div>
            {props.recapApproved && (
              <span className="flex items-center gap-1 rounded-md border border-[#CDEDD6] bg-[#F2FBF5] px-2 py-1 text-[10px] font-bold text-[#248A3D]">
                <Check size={12} /> Approved
              </span>
            )}
          </div>
          <div className="mt-1 text-xs font-medium text-[#6E6E73]">Coverage, choices, evidence, recap.</div>
          <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg border border-[#E5E5EA] bg-white/42 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.7)] backdrop-blur-xl">
            {[
              ["Check", "bg-sci"],
              ["Decide", "bg-[#1E8E5A]"],
              ["Cite", "bg-[#C77700]"]
            ].map(([label, dot]) => (
              <div key={label} className="flex items-center justify-center gap-1 rounded-md bg-white/75 px-2 py-1 text-[10px] font-semibold text-[#3A3A3C]">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <CoverageChecklist items={props.coverageItems} selectedIds={props.selectedCoverageIds} onToggle={props.onToggleCoverage} />
          <DecisionMenu
            options={props.decisionOptions}
            selectedIds={props.selectedDecisionIds}
            selectedOptions={selectedDecisionOptions}
            onToggle={props.onToggleDecision}
          />
          <AdvisorPolicyViewer
            query={policyQuery}
            onQuery={setPolicyQuery}
            results={policyResults}
            documents={props.policyDocuments}
            evidence={props.policyEvidence}
            uploading={props.policyUploading}
            error={props.policyError}
            onFile={props.onPolicyFile}
            onSearch={props.onPolicySearch}
            sessionId={props.sessionId}
          />
          <div className="mb-3 border-t border-line pt-4">
            <div className="text-base font-semibold tracking-tight">Understanding record</div>
            <div className="mt-1 text-xs font-medium text-[#6E6E73]">Audit trail of what the client understood.</div>
          </div>
          {props.recap ? (
            <div className="space-y-5">
              <RecapSection title="Confirmed covered" tone="green" items={props.recap.covered} />
              <RecapSection title="Clarified as not covered" tone="red" items={props.recap.notCovered} />
              <RecapSection title="Follow-up actions" tone="amber" items={props.recap.followUps} />
            </div>
          ) : (
            <EmptyState>
              <FileText className="mx-auto mb-2 text-[#C9C4BE]" size={26} />
              Recap appears after generation.
            </EmptyState>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 border-t border-line bg-white/50 p-4 backdrop-blur-xl">
          <button className="w-full rounded-lg bg-sci px-3 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,113,227,.22)] hover:bg-[#0064C8]" onClick={props.onGenerateRecap}>
            {props.recapLoading ? "Generating..." : props.recap ? "Regenerate recap" : "Generate recap"}
          </button>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#CFE7FF] bg-white/70 px-3 py-3 text-sm font-semibold text-sci backdrop-blur-xl hover:border-sci hover:bg-white"
            onClick={props.onGeneratePreMeeting}
            disabled={props.preMeetingLoading}
          >
            <Sparkles size={15} /> {props.preMeetingLoading ? "Preparing..." : "Refresh prep"}
          </button>
          {props.recap && (
            <button className="w-full rounded-lg border border-ink bg-white/70 px-3 py-3 text-sm font-semibold text-ink backdrop-blur-xl hover:bg-ink hover:text-white" onClick={props.onApproveRecap}>
              {props.recapApproved ? "Approved - tap to undo" : "Advisor approve recap"}
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function coverageTopicFrom(item: string) {
  const text = item.trim().replace(/\?+$/, "");
  const lower = text.toLowerCase();
  const exactTopics = [
    { match: /(what costs|expect.*pay|insured)/, topic: "Expected costs under 'insured'" },
    { match: /(warded|could not work|income|freelance)/, topic: "Income loss during hospitalisation" },
    { match: /(separate.*hospital|hospital bills.*income|income replacement)/, topic: "Hospital bills vs income replacement" },
    { match: /(medishield|shield-plan|private shield)/, topic: "MediShield Life vs private shield layer" },
    { match: /(critical illness|lump-sum|lump sum)/, topic: "Critical illness payout assumption" },
    { match: /(mental health|therapy|psychiatric|counselling)/, topic: "Outpatient mental health scope" },
    { match: /(pre-existing|preexisting|waiting period)/, topic: "Pre-existing condition waiting period" }
  ];
  const matched = exactTopics.find((entry) => entry.match.test(lower));
  if (matched) return matched.topic;

  const cleaned = text
    .replace(/^when you say\s+/i, "")
    .replace(/^if you were\s+/i, "")
    .replace(/^would it help to\s+/i, "")
    .replace(/^what\s+/i, "")
    .replace(/^which\s+/i, "")
    .replace(/^how\s+/i, "")
    .replace(/\bshould\b/gi, "could")
    .trim();

  return cleaned.length > 64 ? `${cleaned.slice(0, 61)}...` : cleaned || "Coverage point to revisit";
}

type InsightTone = "blue" | "green" | "red" | "amber" | "neutral";

const insightToneStyles: Record<InsightTone, { box: string; dot: string; text: string }> = {
  blue: {
    box: "border-[#B9D7E8] bg-[#F0F8FC]",
    dot: "bg-sci",
    text: "text-[#0B5D85]"
  },
  green: {
    box: "border-[#DCEDE3] bg-[#F1F8F3]",
    dot: "bg-[#1E8E5A]",
    text: "text-[#1E6B43]"
  },
  red: {
    box: "border-[#F6D5D8] bg-[#FDECEC]",
    dot: "bg-[#C8102E]",
    text: "text-[#9D1026]"
  },
  amber: {
    box: "border-[#F1DFB8] bg-[#FFF6E8]",
    dot: "bg-[#C77700]",
    text: "text-[#9A6B00]"
  },
  neutral: {
    box: "border-[#E5E5EA] bg-white/70",
    dot: "bg-[#98A2B3]",
    text: "text-[#3A3A3C]"
  }
};

function toneForInsightLine(line: string): InsightTone {
  const lower = line.toLowerCase();
  if (/\b(gap|not covered|not include|excluded|loss of income|income loss|critical illness|mental health|pre-existing|preexisting|risk)\b/.test(lower)) {
    return "red";
  }
  if (/\b(supported|evidence|asked|profile|session|quote|confirmed|covered|understood)\b/.test(lower)) {
    return "green";
  }
  if (/\b(clarify|ask|follow-up|follow up|next|practical|teach-back|teach back|advisor|agent|objective)\b/.test(lower)) {
    return "amber";
  }
  if (/\b(thought|appear|likely|wants|seems|may be|assume|understand)\b/.test(lower)) {
    return "blue";
  }
  return "neutral";
}

function AdvisorInsightText({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  return (
    <div className="apple-panel-quiet p-3">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">AI notes</div>
      <div className="space-y-1.5">
        {lines.map((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={`space-${index}`} className="h-1" />;
          const isBullet = /^[-*]\s+/.test(trimmed);
          const fullDisplay = trimmed.replace(/^[-*]\s+/, "");
          const heading = /:\s*$/.test(fullDisplay) || (!isBullet && fullDisplay.length <= 78);
          const display = compactText(fullDisplay, heading ? 82 : 128);
          const tone = toneForInsightLine(fullDisplay);
          const styles = insightToneStyles[tone];

          return (
            <div key={`${fullDisplay}-${index}`} className={`rounded-lg border px-3 py-2 ${styles.box}`} title={fullDisplay}>
              <div className="flex gap-2">
                {!heading && <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />}
                <span className={`${styles.text} ${heading ? "text-[12px] font-bold uppercase tracking-wide" : "text-[13px] font-medium leading-5"}`}>
                  {display}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CoverageChecklist({
  items,
  selectedIds,
  onToggle
}: {
  items: CoverageItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const completed = selectedIds.length;
  const percentage = Math.round((completed / Math.max(items.length, 1)) * 100);
  return (
    <div className="apple-panel-quiet mb-5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[#3A3A3C]">Coverage progress</div>
        <div className="rounded-md border border-[#CFE7FF] bg-[#F3F9FF] px-2 py-1 text-[10px] font-bold text-sci">
          {completed}/{items.length}
        </div>
      </div>
      <div className="mb-3 h-2 overflow-hidden rounded-full bg-[#E7ECF2]">
        <div className="h-full rounded-full bg-sci transition-all" style={{ width: `${percentage}%` }} />
      </div>
      <div className="space-y-2">
        {items.map((item) => {
          const checked = selectedIds.includes(item.id);
          const tone = {
            green: checked ? "border-[#C9E4D3] bg-[#F1F8F3]" : "border-[#DCEDE3] bg-white",
            amber: checked ? "border-[#F1DFB8] bg-[#FFF6E8]" : "border-[#F1DFB8] bg-white",
            red: checked ? "border-[#F6D5D8] bg-[#FDECEC]" : "border-[#F6D5D8] bg-white"
          }[item.tone];
          return (
            <label key={item.id} className={`block cursor-pointer rounded-lg border px-3 py-2 transition hover:shadow-[0_10px_28px_rgba(0,0,0,.065)] ${tone}`}>
              <div className="flex gap-2">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(item.id)}
                  className="mt-1 h-4 w-4 rounded border-[#C9C4BE] accent-sci"
                />
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold leading-5 text-ink">{item.label}</div>
                  <div className="text-[11.5px] font-semibold leading-4 text-[#475467]" title={item.signal}>
                    {compactText(item.signal, 58)}
                  </div>
                  <div className="mt-1 inline-flex rounded-md bg-white/80 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#6E6E73]">
                    {compactText(item.source, 28)}
                  </div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function DecisionMenu({
  options,
  selectedIds,
  selectedOptions,
  onToggle
}: {
  options: DecisionOption[];
  selectedIds: string[];
  selectedOptions: DecisionOption[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="apple-panel-quiet mb-5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-sci">Decision menu</div>
        <span className="rounded-md bg-[#F3F9FF] px-2 py-1 text-[10px] font-bold text-sci">Advisor-selected</span>
      </div>
      <div className="mb-3 grid gap-2">
        {options.map((option) => {
          const selected = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                selected ? "border-sci bg-[#F3F9FF] shadow-[0_10px_28px_rgba(0,113,227,.10)]" : "border-[#E5E5EA] bg-white/60 hover:border-[#B9D9FF] hover:bg-white"
              }`}
              onClick={() => onToggle(option.id)}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? "border-sci bg-sci text-white" : "border-[#AFC9D8] bg-white"}`}>
                  {selected && <Check size={11} />}
                </span>
                <span className="text-[12px] font-semibold leading-5 text-ink">{option.title}</span>
              </div>
              <div className="ml-6 text-[10px] font-semibold uppercase tracking-wide text-[#6E6E73]">{option.category}</div>
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {(selectedOptions.length ? selectedOptions : [options[0]]).filter(Boolean).map((option) => (
          <div key={`summary-${option.id}`} className="rounded-lg border border-[#E5E5EA] bg-white/58 px-3 py-2" title={option.clientSummary}>
            <div className="mb-1 text-[12px] font-semibold text-sci">{option.title}</div>
            <div className="text-[12px] font-medium leading-5 text-[#3A3A3C]">{compactText(option.clientSummary, 82)}</div>
            <div className="mt-2 flex flex-wrap gap-1">
              {option.linkedNeeds.slice(0, 2).map((need) => (
                <div key={need} className="rounded-md border border-[#E5E5EA] bg-white/70 px-2 py-1 text-[10px] font-semibold text-[#3A3A3C]">
                  {compactText(need, 24)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdvisorPolicyViewer({
  query,
  onQuery,
  results,
  documents,
  evidence,
  uploading,
  error,
  onFile,
  onSearch,
  sessionId
}: {
  query: string;
  onQuery: (value: string) => void;
  results: typeof clauses;
  documents: PolicyDocumentSummary[];
  evidence: PolicyEvidence[];
  uploading: boolean;
  error: string;
  onFile: (file: File) => void;
  onSearch: (query: string) => void;
  sessionId: string;
}) {
  return (
    <div className="apple-panel-quiet mb-5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#3A3A3C]">
          <FileSearch size={14} /> Policy viewer
        </div>
        <label className="flex cursor-pointer items-center gap-1 rounded-md border border-[#CFE7FF] bg-white/75 px-2 py-1 text-[10.5px] font-semibold text-sci transition hover:border-sci">
          {uploading ? <LoaderCircle className="animate-spin" size={12} /> : <Upload size={12} />}
          {uploading ? "Reading" : "Upload PDF"}
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <form
        className="mb-3 flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(query);
        }}
      >
        <input
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          placeholder="Search income, mental health, ICU..."
          className="min-w-0 flex-1 rounded-lg border border-[#D2D2D7] bg-white/72 px-3 py-2 text-xs font-medium outline-none backdrop-blur-xl transition placeholder:text-[#8E8E93] focus:border-sci focus:bg-white focus:ring-4 focus:ring-[#D6EBFF]"
        />
        <button type="submit" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sci text-white" aria-label="Search uploaded policy">
          <Search size={14} />
        </button>
      </form>
      {documents.length > 0 && (
        <div className="mb-2 truncate text-[10.5px] font-semibold text-[#6E6E73]" title={documents[0].fileName}>
          {documents[0].fileName} · {documents[0].pageCount} pages
        </div>
      )}
      {error && <div className="mb-2 rounded-md border border-[#F6D5D8] bg-[#FDECEC] px-2 py-1.5 text-[10.5px] font-semibold text-[#9D1026]">{error}</div>}
      <div className="space-y-2">
        {evidence.length > 0 ? evidence.slice(0, 3).map((item) => (
          <div key={item.id} className="rounded-lg border border-[#CFE7FF] bg-[#F0F8FC] px-3 py-2">
            <div className="mb-1 flex items-center justify-between gap-2 text-[10.5px] font-semibold text-sci">
              <span className="truncate">{item.fileName}</span>
              <span className="shrink-0">Page {item.pageNumber}</span>
            </div>
            <p className="text-[11.5px] font-semibold leading-5 text-[#475467]">{compactText(item.quote, 180)}</p>
            <a
              href={`/api/policies/${sessionId}/documents/${item.documentId}/download`}
              className="mt-1 inline-block text-[10.5px] font-semibold text-sci hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              Open source PDF
            </a>
          </div>
        )) : results.slice(0, 2).map((clause) => {
          return (
            <div key={clause.id} className="rounded-lg border border-[#E5E5EA] bg-white/58 px-3 py-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-sci">{clause.code}</span>
                <span className="truncate text-[11px] font-semibold text-[#3A3A3C]">{clause.title}</span>
              </div>
              <p className="text-[11.5px] font-semibold leading-5 text-[#475467]" title={clause.full}>
                <mark className="rounded bg-[#FFE5A8] px-1 text-[#332500]">{compactText(clause.highlight, 92)}</mark>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function searchPolicy(query: string) {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);
  if (terms.length === 0) return clauses.slice(0, 2);

  return [...clauses]
    .map((clause) => {
      const haystack = `${clause.code} ${clause.title} ${clause.full}`.toLowerCase();
      const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
      return { clause, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.clause)
    .slice(0, 3);
}

function RecapSection({ title, tone, items }: { title: string; tone: "green" | "red" | "amber"; items: string[] }) {
  const tones = {
    green: "text-[#1E8E5A] bg-[#F1F8F3] border-[#DCEDE3]",
    red: "text-[#C8102E] bg-[#FDECEC] border-[#F6D5D8]",
    amber: "text-[#C77700] bg-[#FFF6E8] border-[#F1DFB8]"
  };
  return (
    <div>
      <div className={`mb-2 text-[11px] font-bold uppercase tracking-wide ${tones[tone].split(" ")[0]}`}>{title}</div>
      {(items.length ? items : ["No item captured yet."]).map((item, index) => (
        <div key={`${item}-${index}`} className={`mb-2 rounded-lg border px-3 py-2 text-[12.5px] font-medium leading-5 text-[#3A3A3C] ${tones[tone]}`} title={item}>
          {compactText(item, 84)}
        </div>
      ))}
    </div>
  );
}
