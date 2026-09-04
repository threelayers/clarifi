import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  LogOut,
  MessageSquareText,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";

type ClientProfile = {
  id: string;
  initials: string;
  name: string;
  detail: string;
  focus: string;
  status: string;
  statusTone: "active" | "scheduled" | "complete";
  lastActivity: string;
  demoReady?: boolean;
};

const clients: ClientProfile[] = [
  {
    id: "tan-li-wen",
    initials: "TL",
    name: "Tan Li Wen",
    detail: "28 · Freelance designer",
    focus: "Hospitalisation clarity",
    status: "Session in progress",
    statusTone: "active",
    lastActivity: "Active now",
    demoReady: true,
  },
  {
    id: "marcus-lim",
    initials: "ML",
    name: "Marcus Lim",
    detail: "34 · Operations manager",
    focus: "Life protection review",
    status: "Follow-up due",
    statusTone: "scheduled",
    lastActivity: "2 days ago",
  },
  {
    id: "aisha-rahman",
    initials: "AR",
    name: "Aisha Rahman",
    detail: "31 · Product specialist",
    focus: "Family protection planning",
    status: "Meeting scheduled",
    statusTone: "scheduled",
    lastActivity: "Tomorrow, 10:30",
  },
  {
    id: "priya-nair",
    initials: "PN",
    name: "Priya Nair",
    detail: "29 · Healthcare analyst",
    focus: "Critical illness clarity",
    status: "Recap approved",
    statusTone: "complete",
    lastActivity: "18 Aug 2026",
  },
];

export function AdvisorClientSelector({
  advisorName,
  onOpenDemo,
  onLogout,
}: {
  advisorName: string;
  onOpenDemo: () => void;
  onLogout: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(clients[0].id);
  const visibleClients = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return clients;
    return clients.filter((client) =>
      [client.name, client.detail, client.focus, client.status]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [query]);
  const selected =
    clients.find((client) => client.id === selectedId) || clients[0];

  return (
    <main className="min-h-screen bg-[#F3F6F8] text-ink">
      <header className="border-b border-[#DCE4EA] bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sci text-white shadow-[0_10px_24px_rgba(0,113,227,.2)]">
              <MessageSquareText size={19} />
            </div>
            <div className="leading-tight">
              <div className="text-xl font-semibold">ClariFi</div>
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-sci">
                Advisor workspace
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-xs font-semibold">{advisorName}</div>
              <div className="text-[10px] text-[#667085]">
                Licensed advisor demo
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#DCE4EA] bg-white text-[#667085] transition hover:border-[#E5A7B1] hover:text-[#C8102E]"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-sci">
              <Users size={15} /> Client portfolio
            </div>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Select a client workspace
            </h1>
            <p className="mt-2 text-sm text-[#667085]">
              Review active consultations, upcoming meetings and completed
              sessions.
            </p>
          </div>
          <label className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-[#C9D3DC] bg-white px-3 shadow-sm md:w-[320px]">
            <Search size={16} className="text-[#667085]" />
            <span className="sr-only">Search clients</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search clients"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#98A2B3]"
            />
          </label>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">All clients</h2>
              <span className="text-xs text-[#667085]">
                {visibleClients.length} profiles
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibleClients.map((client) => {
                const active = client.id === selected.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedId(client.id)}
                    className={`min-h-[184px] rounded-lg border bg-white p-4 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sci ${
                      active
                        ? "border-sci ring-1 ring-sci"
                        : "border-[#DCE4EA] hover:border-[#9FC9E5] hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#E8F3FA] text-sm font-bold text-sci">
                        {client.initials}
                      </div>
                      {client.demoReady && (
                        <span className="rounded-md bg-[#E7F4EA] px-2 py-1 text-[9px] font-bold uppercase text-[#187532]">
                          Demo ready
                        </span>
                      )}
                    </div>
                    <div className="mt-3 text-sm font-semibold">
                      {client.name}
                    </div>
                    <div className="mt-1 text-xs text-[#667085]">
                      {client.detail}
                    </div>
                    <div className="mt-4 border-t border-[#E8EDF1] pt-3">
                      <div className="text-[10px] font-semibold uppercase text-[#8A94A3]">
                        Current focus
                      </div>
                      <div className="mt-1 text-xs font-semibold text-[#344054]">
                        {client.focus}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!visibleClients.length && (
              <div className="rounded-lg border border-dashed border-[#C9D3DC] bg-white p-10 text-center text-sm text-[#667085]">
                No client profiles match that search.
              </div>
            )}
          </section>

          <aside className="self-start rounded-lg border border-[#D4DEE6] bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-sci text-sm font-bold text-white">
                {selected.initials}
              </div>
              <div>
                <h2 className="font-semibold">{selected.name}</h2>
                <p className="mt-0.5 text-xs text-[#667085]">
                  {selected.detail}
                </p>
              </div>
            </div>

            <div className="mt-5 divide-y divide-[#E5EAF0] border-y border-[#E5EAF0]">
              <ProfileDetail
                icon={ShieldCheck}
                label="Focus"
                value={selected.focus}
              />
              <ProfileDetail
                icon={Clock3}
                label="Status"
                value={selected.status}
              />
              <ProfileDetail
                icon={CalendarClock}
                label="Activity"
                value={selected.lastActivity}
              />
            </div>

            {selected.demoReady ? (
              <button
                type="button"
                onClick={onOpenDemo}
                className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-sci px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#075782]"
              >
                Open Tan Li Wen demo <ArrowRight size={16} />
              </button>
            ) : (
              <div className="mt-5 rounded-lg border border-[#DCE4EA] bg-[#F5F8FA] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#475467]">
                  <CheckCircle2 size={15} /> Profile available
                </div>
                <p className="mt-1.5 text-[10px] leading-4 text-[#667085]">
                  This portfolio entry demonstrates multi-client management. The
                  populated hackathon session is Tan Li Wen.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function ProfileDetail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[28px_70px_1fr] items-center gap-2 py-3 text-xs">
      <Icon size={15} className="text-sci" />
      <span className="font-medium text-[#667085]">{label}</span>
      <span className="text-right font-semibold text-[#344054]">{value}</span>
    </div>
  );
}
