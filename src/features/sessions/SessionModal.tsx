import { Check, Copy, Database, Link2, Plus, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import type { AuthUser, SessionRecord, SessionSummary } from "@/types/clarifi";

type SessionModalProps = {
  user: AuthUser;
  current: SessionRecord | null;
  sessions: SessionSummary[];
  persistenceMode: "postgres" | "memory";
  loading: boolean;
  error: string;
  onClose: () => void;
  onRefresh: () => void;
  onSelect: (id: string) => void;
  onCreate: (title: string) => void;
  onJoin: (code: string) => void;
};

export function SessionModal(props: SessionModalProps) {
  const [value, setValue] = useState(props.user.role === "advisor" ? "New clarity session" : "");
  const [copied, setCopied] = useState(false);

  const copyCode = async () => {
    if (!props.current?.joinCode) return;
    await navigator.clipboard.writeText(props.current.joinCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.28)] p-5 backdrop-blur-md" onClick={props.onClose}>
      <div
        className="apple-panel w-[520px] max-w-full p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div id="session-dialog-title" className="text-xl font-semibold tracking-tight">Sessions</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#6E6E73]">
              <Database size={12} /> {props.persistenceMode === "postgres" ? "Cloud persistence" : "Demo memory"}
            </div>
          </div>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white/70 text-[#6E6E73]" onClick={props.onClose} aria-label="Close sessions">
            <X size={17} />
          </button>
        </div>

        {props.current?.joinCode && props.user.role === "advisor" && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[#CFE7FF] bg-[#F0F8FC] px-3 py-2.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">Client join code</div>
              <div className="mt-0.5 text-sm font-semibold text-sci">{props.current.joinCode}</div>
            </div>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sci shadow-sm" onClick={copyCode} aria-label="Copy client join code">
              {copied ? <Check size={15} /> : <Copy size={15} />}
            </button>
          </div>
        )}

        <form
          className="mb-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = value.trim();
            if (!trimmed) return;
            if (props.user.role === "advisor") props.onCreate(trimmed);
            else props.onJoin(trimmed.toUpperCase());
          }}
        >
          <input
            className="field-input min-w-0 flex-1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={props.user.role === "advisor" ? "Session title" : "Enter advisor join code"}
          />
          <button className="flex items-center gap-1.5 rounded-lg bg-sci px-3 text-xs font-semibold text-white" disabled={props.loading}>
            {props.user.role === "advisor" ? <Plus size={14} /> : <Link2 size={14} />}
            {props.user.role === "advisor" ? "Create" : "Join"}
          </button>
        </form>

        {props.error && <div className="mb-3 rounded-lg border border-[#F6D5D8] bg-[#FDECEC] px-3 py-2 text-xs font-semibold text-[#9D1026]">{props.error}</div>}

        <div className="mb-2 flex items-center justify-between">
          <div className="text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">Your sessions</div>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-[#6E6E73] hover:bg-white hover:text-sci" onClick={props.onRefresh} aria-label="Refresh sessions">
            <RefreshCw className={props.loading ? "animate-spin" : ""} size={13} />
          </button>
        </div>
        <div className="max-h-64 space-y-2 overflow-y-auto">
          {props.sessions.map((session) => (
            <button
              key={session.id}
              className={`w-full rounded-lg border px-3 py-2.5 text-left transition ${props.current?.id === session.id ? "border-[#8FCBFF] bg-[#EDF7FF]" : "border-[#E5E5EA] bg-white/65 hover:border-[#B9D9FF]"}`}
              onClick={() => props.onSelect(session.id)}
            >
              <div className="truncate text-sm font-semibold text-[#1D1D1F]">{session.title}</div>
              <div className="mt-1 text-[10.5px] font-medium text-[#6E6E73]">Updated {new Date(session.updatedAt).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
