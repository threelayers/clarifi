import { CheckCircle2, Cloud, Database, LogOut, MessageSquareText, Settings } from "lucide-react";
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
};

export function Header({ view, hasApiKey, currentUser, syncStatus, persistenceMode, sessionTitle, onViewChange, onSettings, onLogout, onSession }: HeaderProps) {
  if (view === "client") {
    const connectionLabel = syncStatus === "saving" || syncStatus === "loading"
      ? "Saving"
      : syncStatus === "error"
        ? "Connection issue"
        : persistenceMode === "postgres"
          ? "Connected"
          : "Demo session";

    return (
      <header className="flex h-14 shrink-0 items-center border-b border-[#C8D0D8] bg-white px-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#0B3A5B] text-white">
            <MessageSquareText size={16} />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-[15px] font-semibold text-[#17212B]">ClariFi</div>
            <div className="hidden text-[10px] font-medium text-[#68737E] sm:block">Insurance Clarity Copilot</div>
          </div>
        </div>

        <button className="hidden min-w-0 flex-1 px-5 text-center md:block" onClick={onSession} title="Open consultation sessions">
          <div className="truncate text-xs font-semibold text-[#344552]">{sessionTitle || "Current consultation"}</div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px] text-[#74808B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#237A4B]" /> Consultation in progress
          </div>
        </button>

        <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
          {currentUser?.role === "advisor" ? (
            <div className="hidden items-center gap-1 rounded-md border border-[#C9D1DA] bg-[#F3F5F7] p-0.5 lg:flex">
              <button className="rounded bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#075C91]">Client view</button>
              <button className="rounded px-2.5 py-1.5 text-[11px] font-semibold text-[#68737E] hover:text-[#17212B]" onClick={() => onViewChange("advisor")}>Advisor view</button>
            </div>
          ) : (
            <span className="hidden text-xs font-semibold text-[#344552] lg:inline">Client view</span>
          )}
          <button
            className={`hidden items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium sm:flex ${syncStatus === "error" ? "text-[#B4233A]" : "text-[#5E6974]"}`}
            onClick={onSession}
            title={`${sessionTitle || "Current consultation"} · ${persistenceMode === "postgres" ? "PostgreSQL" : "demo memory"}`}
          >
            {persistenceMode === "postgres" ? <Database size={13} /> : <Cloud size={13} />}
            {connectionLabel}
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#5E6974] hover:bg-[#EEF2F5] hover:text-[#075C91]" onClick={onSettings} aria-label="Open settings" title="Settings">
            <Settings size={16} />
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-md text-[#5E6974] hover:bg-[#FFF0F1] hover:text-[#B4233A]" onClick={onLogout} aria-label="Log out" title="Exit consultation">
            <LogOut size={16} />
          </button>
        </div>
      </header>
    );
  }

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
          className="tab-button tab-idle"
          onClick={() => onViewChange("client")}
        >
          Client view
        </button>
        {currentUser?.role === "advisor" && (
          <button
            className="tab-button tab-active"
            onClick={() => onViewChange("advisor")}
          >
            Advisor view
          </button>
        )}
      </div>

      <div className="flex min-w-[260px] items-center justify-end gap-3">
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
