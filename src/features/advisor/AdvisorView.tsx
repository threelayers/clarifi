import {
  Activity,
  Banknote,
  Brain,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronRight,
  FileSearch,
  HeartPulse,
  History,
  LayoutDashboard,
  LoaderCircle,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  WalletCards,
} from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clauses, profile } from "@/domain/policy";
import { ClariFiAiMark } from "@/shared/components/ClariFiAiMark";
import { LoadingDots } from "@/shared/components/Header";
import { compactText } from "@/shared/lib/text";
import type {
  AdvisorMessage,
  CoverageItem,
  DecisionOption,
  PolicyDocumentSummary,
  PolicyEvidence,
  Recap,
  Understanding,
} from "@/types/clarifi";
import { AdvisorDashboard as ClientIntelligenceDashboard } from "./AdvisorDashboard";
import { AdvisorSessionCapture } from "./AdvisorSessionCapture";

type Props = {
  messages: AdvisorMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  recap: Recap | null;
  recapLoading: boolean;
  recapApproved: boolean;
  onGenerateRecap: () => void;
  onApproveRecap: () => void;
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
  clientNotes: string;
  onClientNotesChange: (notes: string) => void;
  sessionTranscript: string;
  onSessionTranscriptChange: (transcript: string) => void;
  handwrittenNoteImage: string;
  onHandwrittenNoteImageChange: (image: string) => void;
  learningPoints: Understanding[];
  sessionId: string;
};

export function AdvisorView(props: Props) {
  const [tab, setTab] = useState<"dashboard" | "capture" | "copilot">(
    "dashboard",
  );
  const [input, setInput] = useState("");
  const [policyQuery, setPolicyQuery] = useState("income hospital");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedDecisions = useMemo(
    () =>
      props.decisionOptions.filter((item) =>
        props.selectedDecisionIds.includes(item.id),
      ),
    [props.decisionOptions, props.selectedDecisionIds],
  );

  useEffect(() => {
    if (tab === "copilot" && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [props.messages, props.loading, tab]);

  const send = (text = input) => {
    const value = text.trim();
    if (!value) return;
    props.onSend(value);
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 bg-[#F4F6F8]">
      <aside className="hidden w-[330px] shrink-0 flex-col border-r border-[#DCE4EA] bg-[#EAF0F4] xl:flex">
        <div className="border-b border-[#DCE4EA] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sci text-sm font-bold text-white">
              TL
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">
                {profile.name}
              </div>
              <div className="truncate text-xs text-[#667085]">
                {profile.role}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {["First-time", "Freelance", "Hospital cover"].map((item) => (
              <span key={item} className="apple-chip text-[10px]">
                {item}
              </span>
            ))}
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
            Session capture
          </div>
          <AdvisorSessionCapture
            clientNotes={props.clientNotes}
            onClientNotesChange={props.onClientNotesChange}
            sessionTranscript={props.sessionTranscript}
            onSessionTranscriptChange={props.onSessionTranscriptChange}
            handwrittenNoteImage={props.handwrittenNoteImage}
            onHandwrittenNoteImageChange={props.onHandwrittenNoteImageChange}
          />
          <div className="mt-4">
            <AdvisorPolicyViewer
              {...props}
              query={policyQuery}
              onQuery={setPolicyQuery}
            />
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center border-b border-[#DCE4EA] bg-white px-5 py-3">
          <div className="flex rounded-lg bg-[#EEF1F4] p-1">
            <TabButton
              active={tab === "dashboard"}
              onClick={() => setTab("dashboard")}
              icon={<LayoutDashboard size={15} />}
              label="Dashboard"
            />
            <span className="xl:hidden">
              <TabButton
                active={tab === "capture"}
                onClick={() => setTab("capture")}
                icon={<HeartPulse size={15} />}
                label="Capture"
              />
            </span>
            <TabButton
              active={tab === "copilot"}
              onClick={() => setTab("copilot")}
              icon={<MessageSquare size={15} />}
              label="Copilot"
            />
          </div>
          <div className="ml-auto hidden items-center gap-2 text-xs font-semibold text-[#667085] sm:flex">
            <span className="h-2 w-2 rounded-full bg-[#248A3D]" /> Live session
          </div>
        </div>
        {tab === "dashboard" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5 lg:p-7">
            <ClientIntelligenceDashboard {...props} />
          </div>
        ) : tab === "capture" ? (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <div className="mx-auto max-w-2xl">
              <div className="mb-4">
                <h1 className="text-xl font-semibold">Session capture</h1>
                <p className="mt-1 text-xs text-[#667085]">
                  Conversation, notes and policy evidence in one workspace.
                </p>
              </div>
              <AdvisorSessionCapture
                clientNotes={props.clientNotes}
                onClientNotesChange={props.onClientNotesChange}
                sessionTranscript={props.sessionTranscript}
                onSessionTranscriptChange={props.onSessionTranscriptChange}
                handwrittenNoteImage={props.handwrittenNoteImage}
                onHandwrittenNoteImageChange={
                  props.onHandwrittenNoteImageChange
                }
              />
              <div className="mt-4">
                <AdvisorPolicyViewer
                  {...props}
                  query={policyQuery}
                  onQuery={setPolicyQuery}
                />
              </div>
            </div>
          </div>
        ) : (
          <Copilot
            messages={props.messages}
            loading={props.loading}
            input={input}
            setInput={setInput}
            send={send}
            scrollRef={scrollRef}
          />
        )}
      </main>

      <aside className="hidden w-[350px] shrink-0 flex-col border-l border-[#DCE4EA] bg-white lg:flex">
        <div className="border-b border-[#DCE4EA] px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Session actions</h2>
            {props.recapApproved && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-[#248A3D]">
                <Check size={12} /> Approved
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-[#667085]">
            Coverage, choices and final recap.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <CoverageChecklist
            items={props.coverageItems}
            selectedIds={props.selectedCoverageIds}
            onToggle={props.onToggleCoverage}
          />
          <DecisionMenu
            options={props.decisionOptions}
            selectedIds={props.selectedDecisionIds}
            selectedOptions={selectedDecisions}
            onToggle={props.onToggleDecision}
          />
          <div className="mt-4 grid gap-2">
            <button
              className="primary-button justify-center"
              onClick={props.onGenerateRecap}
              disabled={props.recapLoading}
            >
              {props.recapLoading ? (
                <LoaderCircle className="animate-spin" size={15} />
              ) : (
                <Sparkles size={15} />
              )}
              {props.recapLoading ? "Generating..." : "Generate recap"}
            </button>
            <button
              className="secondary-button justify-center"
              onClick={props.onApproveRecap}
              disabled={!props.recap || props.recapApproved}
            >
              {props.recapApproved ? "Recap approved" : "Approve recap"}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold ${active ? "bg-white text-sci shadow-sm" : "text-[#667085]"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function CoverageChecklist({
  items,
  selectedIds,
  onToggle,
}: {
  items: CoverageItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const icons: Record<string, typeof HeartPulse> = {
    "hospital-bills": HeartPulse,
    "income-risk": Banknote,
    "critical-illness": Activity,
    "outpatient-mental-health": Brain,
    "pre-existing": History,
    affordability: WalletCards,
  };
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#475467]">
          Coverage progress
        </h3>
        <span className="text-xs font-semibold text-sci">
          {selectedIds.length}/{items.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const Icon = icons[item.id] || CheckCircle2;
          const active = selectedIds.includes(item.id);
          return (
            <button
              key={item.id}
              onClick={() => onToggle(item.id)}
              title={`${item.signal} ${item.source}`}
              className={`group min-h-[88px] rounded-lg border p-3 text-left transition ${active ? "border-[#9CCDFD] bg-[#EEF7FF]" : "border-[#DCE4EA] bg-[#F8FAFB] hover:bg-white"}`}
            >
              <div className="flex items-start justify-between">
                <Icon
                  size={18}
                  className={active ? "text-sci" : "text-[#667085]"}
                />
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? "border-sci bg-sci text-white" : "border-[#C5CBD2]"}`}
                >
                  {active && <Check size={12} />}
                </span>
              </div>
              <div className="mt-2 text-xs font-semibold leading-4">
                {shortLabel(item.label)}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DecisionMenu({
  options,
  selectedIds,
  selectedOptions,
  onToggle,
}: {
  options: DecisionOption[];
  selectedIds: string[];
  selectedOptions: DecisionOption[];
  onToggle: (id: string) => void;
}) {
  const icons = [ShieldCheck, BriefcaseBusiness, HeartPulse, Brain];
  return (
    <section className="mb-5 border-t border-[#DCE4EA] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-[#475467]">
          Decision menu
        </h3>
        <span className="text-[10px] font-semibold text-[#667085]">
          Advisor selected
        </span>
      </div>
      <div className="space-y-2">
        {options.map((option, index) => {
          const Icon = icons[index] || ShieldCheck;
          const active = selectedIds.includes(option.id);
          return (
            <button
              key={option.id}
              onClick={() => onToggle(option.id)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left ${active ? "border-[#9ED9B1] bg-[#EFF9F2]" : "border-[#DCE4EA] bg-white"}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${active ? "bg-[#248A3D] text-white" : "bg-[#F0F3F6] text-[#667085]"}`}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">
                  {shortLabel(option.title)}
                </div>
                <div className="mt-0.5 truncate text-[10px] uppercase text-[#667085]">
                  {option.category}
                </div>
              </div>
              <ChevronRight size={14} className="text-[#98A2B3]" />
            </button>
          );
        })}
      </div>
      {selectedOptions.length > 0 && (
        <div className="mt-2 rounded-md bg-[#F4F7F9] px-3 py-2 text-[11px] font-medium text-[#475467]">
          Shared:{" "}
          {selectedOptions.map((item) => shortLabel(item.title)).join(", ")}
        </div>
      )}
    </section>
  );
}

function Copilot({
  messages,
  loading,
  input,
  setInput,
  send,
  scrollRef,
}: {
  messages: AdvisorMessage[];
  loading: boolean;
  input: string;
  setInput: (value: string) => void;
  send: (text?: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-6">
            <h1 className="text-xl font-semibold">Private advisor copilot</h1>
            <p className="mt-1 text-xs text-[#667085]">
              Knowledge support only. Recommendations remain with the licensed
              advisor.
            </p>
          </div>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-5 flex items-start ${message.role === "user" ? "justify-end" : ""}`}
            >
              {message.role === "assistant" && (
                <ClariFiAiMark tone="dark" className="mr-3 mt-1" />
              )}
              <div
                className={`max-w-[600px] ${message.role === "user" ? "advisor-user-bubble" : "rounded-lg border border-[#DCE4EA] bg-[#F7F9FA] px-4 py-3 text-sm leading-6"}`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                {(message.citations || []).map((citation, index) => (
                  <div
                    key={`${citation.source}-${index}`}
                    className="mt-2 border-l-2 border-sci pl-3 text-xs text-[#667085]"
                  >
                    <b className="text-sci">{citation.source}</b>
                    <br />“{citation.quote}”
                  </div>
                ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center">
              <ClariFiAiMark tone="dark" className="mr-3" />
              <LoadingDots dark />
            </div>
          )}
        </div>
      </div>
      <div className="border-t border-[#DCE4EA] px-6 py-4">
        <div className="mx-auto max-w-[720px]">
          <div className="mb-2 flex flex-wrap gap-2">
            {["Case summary", "Coverage gaps", "Clarify next"].map((item) => (
              <button
                key={item}
                className="suggestion"
                onClick={() => send(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 rounded-lg border border-[#D2D2D7] bg-white p-2 shadow-sm">
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
              placeholder="Ask about the session..."
              className="max-h-[120px] flex-1 resize-none border-none bg-transparent px-2 py-2 text-sm outline-none"
            />
            <button
              onClick={() => send()}
              className="send-button bg-ink"
              aria-label="Send advisor message"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvisorPolicyViewer(
  props: Props & { query: string; onQuery: (value: string) => void },
) {
  const results = useMemo(() => searchPolicy(props.query), [props.query]);
  return (
    <section className="apple-panel-quiet p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#475467]">
          <FileSearch size={14} /> Policy evidence
        </div>
        <label className="flex cursor-pointer items-center gap-1 rounded-md border border-[#CFE7FF] bg-white px-2 py-1 text-[10px] font-semibold text-sci">
          {props.policyUploading ? (
            <LoaderCircle className="animate-spin" size={12} />
          ) : (
            <Upload size={12} />
          )}{" "}
          PDF
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            disabled={props.policyUploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) props.onPolicyFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(event) => {
          event.preventDefault();
          props.onPolicySearch(props.query);
        }}
      >
        <input
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Search policy..."
          className="min-w-0 flex-1 rounded-md border border-[#D2D2D7] bg-white px-2.5 py-2 text-xs outline-none"
        />
        <button
          className="flex h-8 w-8 items-center justify-center rounded-md bg-sci text-white"
          aria-label="Search policy"
        >
          <Search size={14} />
        </button>
      </form>
      {props.policyError && (
        <p className="mt-2 text-[10px] font-semibold text-[#C8102E]">
          {props.policyError}
        </p>
      )}
      <div className="mt-2 space-y-2">
        {props.policyEvidence.length
          ? props.policyEvidence.slice(0, 2).map((item) => (
              <div
                key={item.id}
                className="rounded-md border border-[#CFE7FF] bg-[#F0F8FC] p-2"
              >
                <div className="text-[10px] font-semibold text-sci">
                  Page {item.pageNumber}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#475467]">
                  {compactText(item.quote, 100)}
                </p>
                <a
                  href={`/api/policies/${props.sessionId}/documents/${item.documentId}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[10px] font-semibold text-sci"
                >
                  Open PDF
                </a>
              </div>
            ))
          : results.slice(0, 1).map((item) => (
              <div key={item.id} className="rounded-md bg-white p-2">
                <div className="text-[10px] font-semibold text-sci">
                  {item.code} · {item.title}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-[#475467]">
                  {compactText(item.highlight, 92)}
                </p>
              </div>
            ))}
      </div>
    </section>
  );
}

function searchPolicy(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return clauses.slice(0, 2);
  return clauses
    .map((clause) => ({
      clause,
      score: terms.reduce(
        (sum, term) =>
          sum +
          (`${clause.code} ${clause.title} ${clause.full}`
            .toLowerCase()
            .includes(term)
            ? 1
            : 0),
        0,
      ),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.clause);
}

function shortLabel(label: string) {
  return label
    .replace(" explained", "")
    .replace(" separated", "")
    .replace(" checked", " check")
    .replace(" / CPF context", "");
}
