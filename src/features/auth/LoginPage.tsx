import { ClipboardCheck, KeyRound, LogIn, MessageSquareText, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import type { DemoAccount } from "@/types/clarifi";

type LoginPayload = { accountId?: string; email?: string; password?: string };

type LoginPageProps = {
  accounts: DemoAccount[];
  loading: boolean;
  error: string;
  onLogin: (payload: LoginPayload) => void;
};

const fallbackAccounts: DemoAccount[] = [
  {
    accountId: "advisor-demo",
    id: "demo-advisor",
    email: "advisor@clarifi.demo",
    name: "Demo Advisor",
    role: "advisor",
    label: "Advisor demo",
    description: "Advisor dashboard, recap approval, decision menu, and evidence controls."
  },
  {
    accountId: "client-demo",
    id: "demo-client-liwen",
    email: "client@clarifi.demo",
    name: "Tan Li Wen",
    role: "client",
    label: "Client demo",
    description: "Client copilot with notes, learning points, and decision preview."
  }
];

const loginFeatures: Array<{ title: string; caption: string; Icon: LucideIcon }> = [
  { title: "Session capture", caption: "Speech and notes", Icon: ClipboardCheck },
  { title: "Two surfaces", caption: "Client and advisor", Icon: Users },
  { title: "Controlled access", caption: "Demo login ready", Icon: KeyRound }
];

export function LoginPage({ accounts, loading, error, onLogin }: LoginPageProps) {
  const availableAccounts = accounts.length ? accounts : fallbackAccounts;
  const advisorAccount = useMemo(() => availableAccounts.find((account) => account.role === "advisor") || availableAccounts[0], [availableAccounts]);
  const clientAccount = useMemo(() => availableAccounts.find((account) => account.role === "client") || availableAccounts[1], [availableAccounts]);
  const [email, setEmail] = useState(advisorAccount?.email || "advisor@clarifi.demo");
  const [password, setPassword] = useState("clarifi-advisor");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onLogin({ email: email.trim(), password });
  };

  const useAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.role === "advisor" ? "clarifi-advisor" : "clarifi-client");
    onLogin({ accountId: account.accountId });
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-paper text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-6 py-5">
        <div className="flex items-center justify-between border-b border-[#DADADF] pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sci text-white shadow-[0_14px_34px_rgba(0,113,227,.24)]">
              <MessageSquareText size={20} />
            </div>
            <div className="leading-tight">
              <div className="text-[22px] font-semibold tracking-tight">ClariFi</div>
              <div className="text-[10px] font-bold uppercase tracking-[.16em] text-sci">Insurance clarity copilot</div>
            </div>
          </div>
          <span className="apple-chip hidden text-sci sm:block">
            Singapore College of Insurance
          </span>
        </div>

        <div className="grid min-w-0 flex-1 items-center gap-8 py-8 lg:grid-cols-[1fr_440px]">
          <div className="login-clamp min-w-0 w-full lg:max-w-[640px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-[#CFE7FF] bg-white/70 px-3 py-1.5 text-xs font-semibold text-sci shadow-[0_10px_30px_rgba(0,0,0,.045)] backdrop-blur-xl">
              <ShieldCheck size={14} /> Knowledge only workspace
            </div>
            <h1 className="login-clamp max-w-[620px] text-[34px] font-semibold leading-[1.04] tracking-tight text-ink sm:w-auto sm:text-[56px]">
              <span className="block">Clarity support for</span>
              <span className="block sm:inline">insurance </span>
              <span className="block sm:inline">conversations.</span>
            </h1>
            <p className="login-clamp mt-4 max-w-[560px] text-base font-medium leading-7 text-[#6E6E73] sm:w-auto">
              <span className="block sm:inline">Use the demo workspace to review </span>
              <span className="block sm:inline">the copilot, evidence, notes, and recap.</span>
            </p>

            <div className="login-clamp mt-7 grid max-w-[600px] gap-3 sm:w-auto sm:grid-cols-3">
              {loginFeatures.map(({ title, caption, Icon }) => (
                <div key={title} className="apple-panel-quiet px-4 py-3">
                  <Icon className="mb-2 text-sci" size={18} />
                  <div className="text-sm font-semibold text-ink">{title}</div>
                  <div className="mt-1 text-xs font-medium text-[#6E6E73]">{caption}</div>
                </div>
              ))}
            </div>

            <div className="apple-panel login-clamp mt-6 max-w-[600px] p-4 sm:w-auto">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-[.14em] text-[#6E6E73]">Demo session</div>
                <div className="rounded-md bg-[#E8F7ED] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#1D8F43]">Ready</div>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {["Learning points", "Decision menu", "Policy quote"].map((item) => (
                  <div key={item} className="rounded-md border border-[#E5E5EA] bg-white/55 px-3 py-2 text-xs font-semibold text-[#3A3A3C]">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form onSubmit={submit} className="apple-panel login-clamp min-w-0 w-full p-6 lg:max-w-none">
            <div className="mb-5">
              <div className="text-2xl font-semibold tracking-tight">Sign in</div>
              <div className="mt-1 text-sm font-medium text-[#6E6E73]">Use a demo account for judging.</div>
            </div>

            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#6E6E73]">Email</label>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="field-input mb-4 w-full"
              autoComplete="username"
            />

            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wide text-[#6E6E73]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="field-input mb-4 w-full"
              autoComplete="current-password"
            />

            {error && <div className="mb-4 rounded-lg border border-[#F6D5D8] bg-[#FDECEC] px-3 py-2 text-xs font-bold text-[#9D1026]">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-sci px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_rgba(0,113,227,.26)] transition hover:bg-[#0064C8] disabled:cursor-wait disabled:opacity-65"
            >
              <LogIn size={16} /> {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="my-5 h-px bg-[#E5E5EA]" />

            <div className="grid gap-2 sm:grid-cols-2">
              {[advisorAccount, clientAccount].filter(Boolean).map((account) => (
                <button
                  key={account.accountId}
                  type="button"
                  disabled={loading}
                  onClick={() => useAccount(account)}
                  className="rounded-lg border border-[#E5E5EA] bg-white/58 px-3 py-3 text-left backdrop-blur-xl transition hover:border-[#B9D9FF] hover:bg-white disabled:cursor-wait disabled:opacity-65"
                >
                  <div className="text-sm font-semibold text-sci">{account.label}</div>
                  <div className="mt-1 text-xs font-medium leading-5 text-[#6E6E73]">{account.email}</div>
                </button>
              ))}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
