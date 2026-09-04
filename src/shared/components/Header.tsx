import { CheckCircle2, Cloud, Database, LogOut, MessageSquareText, Settings, Users } from "lucide-react";
import type { AuthUser } from "@/types/clarifi";

type HeaderProps = {
  view: "client" | "advisor";
  hasApiKey: boolean;
  currentUser: AuthUser | null;
  syncStatus: "local" | "loading" | "saved" | "saving" | "error";
  persistenceMode: "postgres" | "memory";
  sessionTitle: string;
  onViewChange: (view: "client" | "advisor") => void;
  onSettings: () => void;
  onLogout: () => void;
  onSession: () => void;
  onManageClients?: () => void;
};

export function Header({ view, hasApiKey, currentUser, syncStatus, persistenceMode, sessionTitle, onViewChange, onSettings, onLogout, onSession, onManageClients }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line bg-white/72 px-5 shadow-[0_10px_40px_rgba(0,0,0,.045)] backdrop-blur-2xl">
      <div className="flex min-w-[210px] items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sci text-white shadow-[0_14px_34px_rgba(0,113,227,.24)]">
          <MessageSquareText size={19} />
        </div>
        <div className="leading-tight">
          <div className="text-xl font-semibold tracking-tight">ClariFi</div>
          <div className="text-[10px] font-bold uppercase tracking-[.16em] text-sci">
            Insurance clarity copilot
          </div>
        </div>
      </div>

      <div className="flex rounded-lg border border-[#E5E5EA] bg-white/45 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] backdrop-blur-xl">
        <button
          className={`tab-button ${view === "client" ? "tab-active" : "tab-idle"}`}
          onClick={() => onViewChange("client")}
        >
          Client view
        </button>
        {currentUser?.role === "advisor" && (
          <button
            className={`tab-button ${view === "advisor" ? "tab-active" : "tab-idle"}`}
            onClick={() => onViewChange("advisor")}
          >
            Advisor view
          </button>
        )}
      </div>

      <div className="flex min-w-[260px] items-center justify-end gap-3">
        {onManageClients && (
          <button
            type="button"
            onClick={onManageClients}
            className="hidden min-h-9 items-center gap-1.5 rounded-lg border border-[#DCE4EA] bg-white px-3 text-xs font-semibold text-[#475467] transition hover:border-[#9FC9E5] hover:text-sci md:flex"
          >
            <Users size={14} /> Clients
          </button>
        )}
        {currentUser && (
          <button
            className={`apple-chip hidden items-center gap-1.5 lg:flex ${syncStatus === "error" ? "text-[#C8102E]" : "text-sci"}`}
            title={`${sessionTitle || "Current session"} · ${persistenceMode === "postgres" ? "PostgreSQL" : "demo memory"}`}
            onClick={onSession}
          >
            {persistenceMode === "postgres" ? <Database size={13} /> : <Cloud size={13} />}
            {syncStatus === "saving" || syncStatus === "loading" ? "Saving" : syncStatus === "error" ? "Offline" : persistenceMode === "postgres" ? "Saved" : "Demo sync"}
          </button>
        )}
        <span className="hidden items-center gap-1 text-[11px] font-medium tracking-wide text-[#6E6E73] lg:flex">
          Built for <span className="font-semibold text-sci">Singapore College of Insurance</span>
        </span>
        <button
          className="flex items-center gap-2 rounded-lg border border-[#E5E5EA] bg-white/65 px-3 py-2 text-xs font-semibold text-[#3A3A3C] shadow-[0_8px_24px_rgba(0,0,0,.04)] backdrop-blur-xl transition hover:border-[#B9D9FF] hover:bg-white hover:text-sci"
          onClick={onSettings}
          aria-label="Open settings"
        >
          <span
            className={`h-2 w-2 rounded-full ${hasApiKey ? "bg-[#1E8E5A] shadow-[0_0_0_3px_rgba(30,142,90,.18)]" : "bg-sciGold shadow-[0_0_0_3px_rgba(242,169,0,.2)]"}`}
          />
          <Settings size={15} />
        </button>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5E5EA] bg-white/65 text-[#6E6E73] shadow-[0_8px_24px_rgba(0,0,0,.04)] backdrop-blur-xl transition hover:border-[#FF3B30] hover:bg-white hover:text-[#FF3B30]"
          onClick={onLogout}
          aria-label="Log out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}

export function LoadingDots({ dark = false }: { dark?: boolean }) {
  const color = dark ? "bg-ink" : "bg-sci";
  return (
    <div className="flex gap-1 rounded-lg border border-[#E5E5EA] bg-white/85 px-4 py-3 shadow-[0_10px_32px_rgba(0,0,0,.055)] backdrop-blur-xl">
      <span className={`loading-dot ${color}`} />
      <span className={`loading-dot animation-delay-200 ${color}`} />
      <span className={`loading-dot animation-delay-400 ${color}`} />
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[#D2D2D7] bg-white/58 px-5 py-7 text-center text-sm font-medium leading-6 text-[#8E8E93] backdrop-blur-xl">
      <CheckCircle2 className="mx-auto mb-2 text-[#AEAEB2]" size={26} />
      {children}
    </div>
  );
}
