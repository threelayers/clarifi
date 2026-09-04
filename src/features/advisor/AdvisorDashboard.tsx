import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Baby,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Download,
  HeartPulse,
  Home,
  Info,
  ListChecks,
  Minus,
  Mic,
  NotebookPen,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  WandSparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { myInfoSections } from "@/domain/sessionData";
import { refineProductSuggestions } from "@/services/clarifiApi";
import { ClientAvatar } from "@/shared/components/ClientAvatar";
import type {
  AdvisorMessage,
  CoverageItem,
  DecisionOption,
  ProductSuggestionCatalog,
  Understanding,
} from "@/types/clarifi";
import { exportAdvisorReport } from "./exportAdvisorReport";
import {
  buildUnderstandingSummary,
  coverageDelta,
  coverageThreshold,
  dashboardCategories,
  dashboardCategoryIds,
  getDashboardSnapshot,
  latestDashboardSnapshot,
  selectCheckpoint,
  sortCategoryIdsByUnmetNeed,
} from "./dashboardData";
import type {
  CategoryMetrics,
  DashboardCategory,
  DashboardCategoryId,
  DashboardCheckpoint,
  DashboardSessionSnapshot,
} from "./dashboardData";

type AdvisorDashboardProps = {
  messages: AdvisorMessage[];
  coverageItems: CoverageItem[];
  selectedCoverageIds: string[];
  decisionOptions: DecisionOption[];
  selectedDecisionIds: string[];
  clientNotes: string;
  sessionTranscript: string;
  handwrittenNoteImage: string;
  learningPoints: Understanding[];
};

type Category = DashboardCategory & CategoryMetrics;

const profileIcons: Record<string, LucideIcon> = {
  Name: UserRound,
  Age: Baby,
  "Residential status": Home,
  Employment: BriefcaseBusiness,
  "Income pattern": Banknote,
};

const profileFields = myInfoSections
  .flatMap((section) => section.fields)
  .filter((field) => profileIcons[field.label])
  .slice(0, 5);

const categoryLookup = dashboardCategories.reduce(
  (result, category) => {
    result[category.id] = category;
    return result;
  },
  {} as Record<DashboardCategoryId, DashboardCategory>,
);

const selectedClient = {
  name: "Tan Li Wen",
  initials: "TL",
  avatarSrc: "/avatars/tan-li-wen.png",
};

export function AdvisorDashboard(props: AdvisorDashboardProps) {
  const [dashboardTab, setDashboardTab] = useState<
    "profile" | "engagement" | "products"
  >("profile");
  const [isExporting, setIsExporting] = useState(false);
  const [sessionNumber, setSessionNumber] = useState(
    latestDashboardSnapshot.sessionNumber,
  );
  const [durationMinutes, setDurationMinutes] = useState(
    latestDashboardSnapshot.durationMinutes,
  );
  const sessionText = [
    props.sessionTranscript,
    props.clientNotes,
    ...props.messages.map((message) => message.text),
    ...props.selectedDecisionIds,
  ]
    .join(" ")
    .toLowerCase();
  const snapshot = getDashboardSnapshot(sessionNumber);
  const duration = Math.min(durationMinutes, snapshot.durationMinutes);
  const checkpoint = selectCheckpoint(snapshot, duration);
  const categories = useMemo(
    () =>
      dashboardCategories.map((category) => ({
        ...category,
        ...checkpoint.categories[category.id],
      })),
    [checkpoint],
  );
  const orderedCategories = useMemo(() => {
    const ids = sortCategoryIdsByUnmetNeed(
      dashboardCategoryIds,
      checkpoint.categories,
    );
    return ids.map((id) => categories.find((category) => category.id === id)!);
  }, [categories, checkpoint.categories]);
  const engagedCategories = categories.filter(
    (category) => category.understanding > 0 || category.id === "shield",
  );
  const selected = props.selectedCoverageIds.length;
  const total = props.coverageItems.length;
  const coverageProgress = Math.round((selected / Math.max(total, 1)) * 100);
  const understood = props.learningPoints.filter(
    (item) => item.status === "covered",
  ).length;
  const attention = props.learningPoints.length
    ? props.learningPoints.filter((item) => item.status !== "covered").length
    : total - selected;
  const needs = buildNeeds(sessionText);
  const engagement = snapshot.checkpoints.filter(
    (item) => item.durationMinutes <= duration,
  );

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAdvisorReport({
        coverageItems: props.coverageItems,
        selectedCoverageIds: props.selectedCoverageIds,
        decisionOptions: props.decisionOptions,
        selectedDecisionIds: props.selectedDecisionIds,
        coverageProfile: orderedCategories.map(({ label, coverage }) => ({
          label,
          coverage,
        })),
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl pb-8">
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="text-xs font-semibold text-sci">Dashboard</div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Client intelligence
          </h1>
          <p className="mt-1 text-sm text-[#667085]">
            Profile, engagement and product pathways in focused views.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#102A43] px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-[#173F5F] disabled:cursor-wait disabled:opacity-60"
        >
          <Download size={15} />
          {isExporting ? "Preparing report..." : "Export report as PDF"}
        </button>
      </div>

      <nav
        className="mb-5 grid rounded-lg border border-[#DCE4EA] bg-white p-1 sm:grid-cols-3"
        aria-label="Client intelligence dashboards"
      >
        <DashboardTab
          active={dashboardTab === "profile"}
          icon={UserRound}
          label="Persona & profile"
          onClick={() => setDashboardTab("profile")}
        />
        <DashboardTab
          active={dashboardTab === "engagement"}
          icon={Target}
          label="Needs & engagement"
          onClick={() => setDashboardTab("engagement")}
        />
        <DashboardTab
          active={dashboardTab === "products"}
          icon={Sparkles}
          label="Product suggestions"
          onClick={() => setDashboardTab("products")}
        />
      </nav>

      {dashboardTab === "profile" && (
        <ProfileDashboard items={orderedCategories} snapshot={snapshot} />
      )}

      {dashboardTab === "engagement" && (
        <EngagementDashboard
          needs={needs}
          engagement={engagement}
          engagedCategories={engagedCategories}
          coverageProgress={coverageProgress}
          selected={selected}
          total={total}
          understood={understood}
          attention={attention}
          categories={orderedCategories}
          snapshot={snapshot}
          checkpoint={checkpoint}
          sessionNumber={sessionNumber}
          durationMinutes={duration}
          onSessionNumberChange={(value) => {
            const nextSnapshot = getDashboardSnapshot(value);
            setSessionNumber(nextSnapshot.sessionNumber);
            setDurationMinutes((current) =>
              Math.max(
                nextSnapshot.checkpoints[0].durationMinutes,
                Math.min(current, nextSnapshot.durationMinutes),
              ),
            );
          }}
          onDurationChange={setDurationMinutes}
          {...props}
        />
      )}

      {dashboardTab === "products" && (
        <ProductSuggestionsDashboard
          suggestions={orderedCategories}
          clientNotes={props.clientNotes}
          sessionTranscript={props.sessionTranscript}
          timestamp={snapshot.timestamp}
        />
      )}
    </div>
  );
}

function DashboardTab({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sci ${
        active
          ? "bg-[#E8F3FA] text-sci shadow-sm"
          : "text-[#667085] hover:bg-[#F4F6F8] hover:text-[#344054]"
      }`}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function ProfileDashboard({
  items,
  snapshot,
}: {
  items: Category[];
  snapshot: DashboardSessionSnapshot;
}) {
  const identityFields = profileFields.filter((field) =>
    ["Name", "Age", "Residential status"].includes(field.label),
  );
  const financialFields = profileFields.filter((field) =>
    ["Employment", "Income pattern"].includes(field.label),
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5 shadow-[0_8px_28px_rgba(30,64,96,.04)]">
        <div className="flex items-start gap-3 border-b border-[#E5EAF0] pb-4">
          <ClientAvatar
            src={selectedClient.avatarSrc}
            name={selectedClient.name}
            initials={selectedClient.initials}
            sizeClassName="h-16 w-16"
            textClassName="text-lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">{selectedClient.name}</h2>
            <p className="mt-0.5 text-xs text-[#667085]">Individual profile</p>
            <DataTimestamp timestamp={snapshot.timestamp} className="mt-2" />
          </div>
          <div className="shrink-0 rounded-lg border border-[#CFE2F3] bg-[#F3F9FF] px-3 py-2 text-right">
            <div className="text-2xl font-bold leading-none text-[#102A43]">
              {snapshot.sessionNumber}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-sci">
              Sessions
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[9px] text-[#667085]">
              Since Mar 2026
            </div>
          </div>
        </div>

        <ProfileFieldGroup title="Identity" fields={identityFields} />
        <ProfileFieldGroup title="Financial context" fields={financialFields} />

        <div className="mt-4 rounded-lg bg-[#F4F7F9] px-3 py-2.5 text-[10px] leading-4 text-[#667085]">
          Simulated MyInfo and client-declared profile used for this POC.
        </div>
      </section>

      <CoveragePortfolio categories={items} timestamp={snapshot.timestamp} />
    </div>
  );
}

function ProfileFieldGroup({
  title,
  fields,
}: {
  title: string;
  fields: typeof profileFields;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#E5EAF0] bg-[#FBFCFD] p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[#667085]">
        {title}
      </div>
      <div className="divide-y divide-[#E5EAF0]">
        {fields.map((field) => {
          const Icon = profileIcons[field.label];
          return (
            <div key={field.label} className="flex items-center gap-3 py-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EFF6FF] text-sci">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase text-[#667085]">
                  {field.label}
                </div>
                <div className="mt-0.5 truncate text-xs font-semibold text-[#1D2939]">
                  {field.value}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

type EngagementDashboardProps = AdvisorDashboardProps & {
  needs: string[];
  engagement: DashboardCheckpoint[];
  engagedCategories: Category[];
  categories: Category[];
  snapshot: DashboardSessionSnapshot;
  checkpoint: DashboardCheckpoint;
  sessionNumber: number;
  durationMinutes: number;
  onSessionNumberChange: (value: number) => void;
  onDurationChange: (value: number) => void;
  coverageProgress: number;
  selected: number;
  total: number;
  understood: number;
  attention: number;
};

function EngagementDashboard({
  needs,
  engagement,
  engagedCategories,
  categories,
  snapshot,
  checkpoint,
  sessionNumber,
  durationMinutes,
  onSessionNumberChange,
  onDurationChange,
  coverageProgress,
  selected,
  total,
  understood,
  attention,
  learningPoints,
  coverageItems,
  selectedCoverageIds,
  sessionTranscript,
  clientNotes,
  handwrittenNoteImage,
}: EngagementDashboardProps) {
  const averageRelativity = Math.round(
    engagement.reduce((sum, item) => sum + item.engagement, 0) /
      Math.max(engagement.length, 1),
  );
  const summary = buildUnderstandingSummary(
    checkpoint.categories,
    categoryLookup,
  );

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Client needs & engagement</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Conversation priorities and understanding across relevant policy
              areas.
            </p>
          </div>
          <DataTimestamp timestamp={snapshot.timestamp} />
        </div>
        <div className="grid gap-4 2xl:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase text-[#667085]">
              Top 3 needs statement
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {needs.map((need, index) => {
                const [label, why] = need.split("|");
                return (
                  <div
                    key={need}
                    className="min-h-[126px] rounded-lg border border-[#E5EAF0] bg-[#F8FAFB] p-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-sci shadow-sm">
                      {index + 1}
                    </span>
                    <div className="mt-3 text-xs font-semibold leading-5 text-[#1D2939]">
                      {label}
                    </div>
                    <div className="mt-2 text-[10px] font-medium leading-4 text-[#667085]">
                      {why}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase text-[#667085]">
              Engagement level
            </div>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
              <MetricCard
                label="Current conversation relevance"
                value={`${averageRelativity}%`}
                detail={`Checkpoint at ${durationMinutes} min`}
                icon={Target}
              />
              <MetricCard
                label="Session checkpoint"
                value={`S${sessionNumber} · ${checkpoint.engagement}%`}
                detail={checkpoint.trigger}
                icon={CalendarClock}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="flex flex-col gap-4 border-b border-[#E5EAF0] pb-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="font-semibold">Engagement over time + priority mapping</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Both views update from the same session and duration filters.
            </p>
            <DataTimestamp timestamp={snapshot.timestamp} className="mt-2" />
          </div>
          <DashboardFilters
            sessionNumber={sessionNumber}
            durationMinutes={durationMinutes}
            minDuration={snapshot.checkpoints[0].durationMinutes}
            maxDuration={snapshot.durationMinutes}
            onSessionNumberChange={onSessionNumberChange}
            onDurationChange={onDurationChange}
          />
        </div>
        <div className="mt-5 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <EngagementChart points={engagement} />
          <PriorityMap categories={categories} />
        </div>
        <div className="mt-5 rounded-lg border border-[#CFE2F3] bg-[#F3F9FF] p-3">
          <div className="flex items-start gap-2">
            <Info size={15} className="mt-0.5 shrink-0 text-sci" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-sci">
                Plain-English dynamic summary
              </div>
              <p className="mt-1 text-xs leading-5 text-[#344054]">{summary}</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <UnderstandingChart
          categories={engagedCategories}
          summary={summary}
          timestamp={snapshot.timestamp}
        />
        <FollowUpAreas
          learningPoints={learningPoints}
          coverageItems={coverageItems}
          selectedIds={selectedCoverageIds}
          timestamp={snapshot.timestamp}
        />
      </div>

      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Session progress</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Discussion coverage against the advisor checklist.
            </p>
          </div>
          <DataTimestamp timestamp={snapshot.timestamp} />
        </div>
        <div className="mt-4 grid gap-5 xl:grid-cols-[auto_1fr] xl:items-start">
          <div className="flex items-start gap-4">
            <div>
              <Ring value={coverageProgress} />
              <ThresholdGauge value={coverageProgress} />
            </div>
            <div>
              <div className="text-sm font-semibold">Discussion coverage</div>
              <p className="mt-1 text-xs leading-5 text-[#667085]">
                {selected === total
                  ? "All planned topics are marked covered."
                  : `${total - selected} planned topics still need confirmation.`}
              </p>
            </div>
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2">
              <Signal label="Understood" value={understood} tone="green" />
              <Signal label="Needs attention" value={attention} tone="amber" />
            </div>
            <ProgressSources
              selected={selected}
              total={total}
              hasTranscript={Boolean(sessionTranscript.trim())}
              hasNotes={Boolean(clientNotes.trim() || handwrittenNoteImage)}
              learningPointCount={learningPoints.length}
            />
            <p className="mt-3 rounded-md bg-[#F3F9FF] px-3 py-2 text-[10px] leading-4 text-[#344054]">
              {summary}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex min-h-[92px] items-center gap-3 rounded-lg border border-[#D9E4EC] bg-[#F4F8FB] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sci shadow-sm">
        <Icon size={17} />
      </div>
      <div>
        <div className="text-[10px] font-semibold text-[#667085]">{label}</div>
        <div className="mt-0.5 text-xl font-bold text-[#102A43]">{value}</div>
        <div className="mt-0.5 text-[9px] text-[#8A94A3]">{detail}</div>
      </div>
    </div>
  );
}

function DataTimestamp({
  timestamp,
  className = "",
}: {
  timestamp: string;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 text-[9px] font-semibold text-[#8A94A3] ${className}`}>
      <Clock3 size={11} /> As of {timestamp}
    </div>
  );
}

function DashboardFilters({
  sessionNumber,
  durationMinutes,
  minDuration,
  maxDuration,
  onSessionNumberChange,
  onDurationChange,
}: {
  sessionNumber: number;
  durationMinutes: number;
  minDuration: number;
  maxDuration: number;
  onSessionNumberChange: (value: number) => void;
  onDurationChange: (value: number) => void;
}) {
  return (
    <div className="grid w-full gap-2 sm:grid-cols-[150px_minmax(180px,240px)] lg:w-auto">
      <label className="flex min-h-11 flex-col justify-center rounded-lg border border-[#C9D3DC] bg-[#F8FAFB] px-3 py-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-[#667085]">
          Session number
        </span>
        <select
          value={sessionNumber}
          onChange={(event) => onSessionNumberChange(Number(event.target.value))}
          className="mt-0.5 w-full bg-transparent text-xs font-semibold text-[#1D2939] outline-none"
        >
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <option key={value} value={value}>
              Session {value}
            </option>
          ))}
        </select>
      </label>
      <label className="rounded-lg border border-[#C9D3DC] bg-[#F8FAFB] px-3 py-1.5">
        <span className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wide text-[#667085]">
          <span>Duration (minutes)</span>
          <span className="text-sci">{durationMinutes} min</span>
        </span>
        <input
          type="range"
          min={minDuration}
          max={maxDuration}
          step={1}
          value={durationMinutes}
          onChange={(event) => onDurationChange(Number(event.target.value))}
          className="advisor-range mt-1 w-full"
          aria-label="Duration in minutes"
        />
      </label>
    </div>
  );
}

function ThresholdGauge({ value }: { value: number }) {
  const threshold = coverageThreshold(value);
  const tone =
    threshold.tone === "green"
      ? "border-[#B7E1C1] bg-[#EAF7EE] text-[#187532]"
      : threshold.tone === "amber"
        ? "border-[#F4D59A] bg-[#FFF4DF] text-[#9A5B00]"
        : "border-[#F1B6BF] bg-[#FFF0F2] text-[#A41329]";
  return (
    <div className="mt-2 w-24">
      <div className="relative flex h-2 overflow-visible rounded-full">
        <span className="h-2 w-1/2 rounded-l-full bg-[#C8102E]" />
        <span className="h-2 w-1/4 bg-[#D69200]" />
        <span className="h-2 w-1/4 rounded-r-full bg-[#248A3D]" />
        <span
          className="absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-[#102A43] shadow-sm"
          style={{ left: `${Math.min(100, Math.max(0, value))}%` }}
          aria-hidden="true"
        />
      </div>
      <div className={`mt-2 rounded-md border px-1.5 py-1 text-center ${tone}`}>
        <div className="text-[8px] font-bold leading-3">{threshold.label}</div>
        <div className="text-[8px] font-medium leading-3">
          {value < 50 ? "<50" : value < 75 ? "50–74" : "75+"}
        </div>
      </div>
    </div>
  );
}

function FollowUpStatusIcon({ value }: { value: number }) {
  const threshold = coverageThreshold(value);
  const Icon =
    threshold.tone === "red"
      ? AlertTriangle
      : threshold.tone === "amber"
        ? Info
        : CheckCircle2;
  return <Icon size={15} className={statusText(value)} aria-hidden="true" />;
}

const productCatalog: ProductSuggestionCatalog = {
  life: [
    { name: "SecureLife Protect", intent: "Term protection" },
    { name: "WholeLife Assure", intent: "Lifetime protection" },
    { name: "LifeGuard Plus", intent: "Family continuity" },
  ],
  investment: [
    { name: "WealthGrow Advantage", intent: "Growth focused" },
    { name: "FlexInvest Choice", intent: "Balanced exposure" },
    { name: "FutureLink Invest", intent: "Long-term participation" },
  ],
  critical: [
    { name: "CriticalCare Shield", intent: "Comprehensive support" },
    { name: "HealthWatch CI", intent: "Early-stage support" },
    { name: "LifeCure Guardian", intent: "Advanced protection" },
  ],
  shield: [
    { name: "MediShield Life", intent: "Basic hospital cover" },
    { name: "HealthConnect Plus", intent: "Enhanced hospital cover" },
    { name: "TotalShield Premier", intent: "Private hospital option" },
  ],
  retirement: [
    { name: "RetireReady Plan", intent: "Regular savings" },
    { name: "GoldenYears Income", intent: "Retirement payout" },
    { name: "WealthForLife Annuity", intent: "Lifetime income" },
  ],
};

function ProductSuggestionsDashboard({
  suggestions,
  clientNotes,
  sessionTranscript,
  timestamp,
}: {
  suggestions: Category[];
  clientNotes: string;
  sessionTranscript: string;
  timestamp: string;
}) {
  const [instruction, setInstruction] = useState("");
  const [catalog, setCatalog] = useState(productCatalog);
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateTone, setUpdateTone] = useState<"success" | "error">("success");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const orderedCategories = suggestions;

  const regenerate = async () => {
    const request = instruction.trim();
    if (!request) return;
    setIsRegenerating(true);
    setUpdateMessage("");
    setUpdateTone("success");
    try {
      const result = await refineProductSuggestions(request, catalog, {
        clientNotes,
        sessionTranscript,
      });
      setCatalog(result.catalog);
      setUpdateMessage(result.summary);
      setInstruction("");
    } catch (error) {
      setUpdateTone("error");
      setUpdateMessage(
        error instanceof Error
          ? error.message
          : "Product suggestions could not be refreshed.",
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#C9D8E3] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#344054]">
            <WandSparkles size={16} className="text-sci" /> Refine product
            suggestions
          </div>
          <DataTimestamp timestamp={timestamp} />
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void regenerate();
            }}
            placeholder="e.g. Replace LifeGuard Plus with FamilyGuard Term"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[#C9D3DC] bg-[#F8FAFB] px-3 text-sm outline-none focus:border-sci focus:ring-4 focus:ring-[#D6EBFF]"
          />
          <button
            type="button"
            onClick={() => void regenerate()}
            disabled={!instruction.trim() || isRegenerating}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sci px-4 text-xs font-semibold text-white transition hover:bg-[#075782] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <Sparkles size={15} />
            {isRegenerating ? "Regenerating..." : "Regenerate"}
          </button>
        </div>
        {updateMessage && (
          <p
            className={`mt-2 text-[10px] font-medium ${updateTone === "error" ? "text-[#C8102E]" : "text-[#248A3D]"}`}
          >
            {updateMessage}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold">Product suggestions</h2>
            <p className="mt-1 text-xs text-[#667085]">
              Prioritised by unmet need, with the same category icon and colour
              mapping used across the advisor console.
            </p>
            <span className="mt-2 inline-flex rounded-md bg-[#F1EDFF] px-2 py-1 text-[9px] font-bold uppercase text-[#6F42C1]">
              Illustrative POC catalog
            </span>
          </div>
          <DataTimestamp timestamp={timestamp} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
          {orderedCategories.map((category, categoryIndex) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="overflow-hidden rounded-lg border border-[#DCE4EA] bg-[#F8FAFB]"
              >
                <div className="bg-white p-3">
                  <div
                    className="-mx-3 -mt-3 mb-3 h-1"
                    style={{ backgroundColor: category.color }}
                  />
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: category.softColor,
                      color: category.color,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div className="mt-2 text-sm font-semibold leading-5">
                    {category.label}
                  </div>
                  {categoryIndex < 3 && (
                    <div
                      className="mt-1 text-[9px] font-bold uppercase"
                      style={{ color: category.color }}
                    >
                      Session priority {categoryIndex + 1}
                    </div>
                  )}
                </div>
                <div className="divide-y divide-[#E5EAF0] p-2">
                  {catalog[category.id].map((product) => (
                    <div
                      key={product.name}
                      className="flex min-h-[68px] gap-2 p-2"
                    >
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white shadow-sm"
                        style={{ color: category.color }}
                      >
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold leading-4 text-[#1D2939]">
                          {product.name}
                        </div>
                        <div className="mt-1 text-[9px] leading-3 text-[#667085]">
                          {product.intent}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[10px] leading-4 text-[#667085]">
          Product pathways are discussion support only. The licensed advisor
          remains responsible for suitability and recommendations.
        </p>
      </section>
    </div>
  );
}

const followUpSchemes: Record<
  string,
  { category: string; color: string; keywords: string[] }
> = {
  "hospital-bills": {
    category: "Hospital & surgical",
    color: "#1976D2",
    keywords: ["hospital", "ward", "surgical"],
  },
  "income-risk": {
    category: "Income continuity",
    color: "#7C3AED",
    keywords: ["income", "salary", "work"],
  },
  "critical-illness": {
    category: "Critical illness",
    color: "#D97706",
    keywords: ["critical", "lump-sum", "lump sum"],
  },
  "outpatient-mental-health": {
    category: "Mental wellness",
    color: "#0891B2",
    keywords: ["mental", "therapy", "counselling"],
  },
  "pre-existing": {
    category: "Underwriting",
    color: "#4F46E5",
    keywords: ["pre-existing", "waiting", "waiting period"],
  },
  affordability: {
    category: "Affordability",
    color: "#C026D3",
    keywords: ["affordability", "cpf", "premium"],
  },
};

function FollowUpAreas({
  learningPoints,
  coverageItems,
  selectedIds,
  timestamp,
}: {
  learningPoints: Understanding[];
  coverageItems: CoverageItem[];
  selectedIds: string[];
  timestamp: string;
}) {
  const areas = coverageItems
    .map((item) => {
      const scheme = followUpSchemes[item.id];
      const learningPoint = learningPoints.find((point) => {
        const text = point.point.toLowerCase();
        return scheme.keywords.some((keyword) => text.includes(keyword));
      });
      let priority = selectedIds.includes(item.id)
        ? 28
        : item.tone === "red"
          ? 88
          : item.tone === "amber"
            ? 68
            : 48;
      if (learningPoint?.status === "covered") priority = 22;
      if (learningPoint?.status === "action") priority = 74;
      if (learningPoint?.status === "not_covered") priority = 92;
      return { item, scheme, priority };
    })
    .sort((a, b) => b.priority - a.priority);

  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Follow-up areas</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Dynamic priority bars use shared attention thresholds.
          </p>
        </div>
        <DataTimestamp timestamp={timestamp} />
      </div>
      <div className="space-y-4">
        {areas.map(({ item, scheme, priority }) => (
          <div key={item.id}>
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <FollowUpStatusIcon value={priority} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-[#344054]">
                    {item.label}
                  </div>
                  <div className="mt-0.5 truncate text-[9px] font-bold uppercase text-[#667085]">
                    {scheme.category}
                  </div>
                </div>
              </div>
              <span
                className={`shrink-0 text-xs font-bold ${statusText(priority)}`}
              >
                {priority}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-[#E9EDF1]">
              <div
                className={`h-full rounded-full ${statusColor(priority)}`}
                style={{ width: `${priority}%` }}
              />
              <span
                className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_5px_rgba(0,0,0,.22)] ${statusColor(priority)}`}
                style={{ left: `${priority}%` }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#E5EAF0] pt-3 text-[9px] font-semibold text-[#8A94A3]">
        <span>0 · Lower priority</span>
        <span>100 · Revisit sooner</span>
      </div>
    </section>
  );
}

function CoveragePortfolio({
  categories: items,
  timestamp,
}: {
  categories: Category[];
  timestamp: string;
}) {
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5 shadow-[0_8px_28px_rgba(30,64,96,.04)]">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Current coverage profile</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Sorted by largest unmet need. Bars and icons identify the insurance
            category; status labels show the current protection level.
          </p>
        </div>
        <DataTimestamp timestamp={timestamp} />
      </div>
      <div className="space-y-3">
        {items.map((category) => {
          const Icon = category.icon;
          const delta = coverageDelta(
            category.coverage,
            category.previousCoverage,
          );
          const threshold = coverageThreshold(category.coverage);
          const TrendIcon =
            delta < 0 ? ArrowDownRight : delta > 0 ? ArrowUpRight : Minus;
          return (
            <div
              key={category.id}
              className="grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-lg border border-[#E5EAF0] bg-[#FBFCFD] p-2.5 sm:grid-cols-[36px_1fr_auto]"
              style={{ borderLeft: `4px solid ${category.color}` }}
            >
              <div
                className="flex h-8 w-8 items-center justify-center rounded-md"
                style={{
                  backgroundColor: category.softColor,
                  color: category.color,
                }}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-xs font-semibold sm:text-sm">
                    {category.label}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#EEF1F4]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${category.coverage}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span
                    className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${deltaText(delta)}`}
                    title="Change since previous session"
                  >
                    <TrendIcon size={13} aria-hidden="true" />
                    {formatDelta(delta)} pp
                  </span>
                  <span
                    className="text-base font-bold leading-none"
                    style={{ color: category.color }}
                  >
                    {category.coverage}%
                  </span>
                </div>
                <div
                  className={`mt-1 text-[8px] font-bold uppercase tracking-wide ${statusText(category.coverage)}`}
                >
                  {threshold.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-[#E5EAF0] pt-3 text-[10px] leading-4 text-[#667085]">
        Percentage = recorded coverage scope ÷ profile-indicated need. Deltas are
        percentage-point changes from the previous session.
      </p>
    </section>
  );
}

function EngagementChart({ points }: { points: DashboardCheckpoint[] }) {
  const coordinates = points.map((point, index) => {
    const x = 12 + index * (76 / Math.max(points.length - 1, 1));
    const y = 88 - point.engagement * 0.72;
    return `${x},${y}`;
  });
  const latest = points.at(-1);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase text-[#667085]">
          Engagement level
        </div>
        <div className="text-xs font-bold text-[#248A3D]">
          {latest?.engagement || 0}% relevant
        </div>
      </div>
      <div className="rounded-lg border border-[#E5EAF0] bg-[#F8FAFB] p-3">
        <svg
          viewBox="0 0 100 100"
          className="h-[190px] w-full"
          role="img"
          aria-label="Conversation relevance over session duration"
        >
          {[16, 40, 64, 88].map((y) => (
            <line
              key={y}
              x1="12"
              y1={y}
              x2="92"
              y2={y}
              stroke="#DFE5EA"
              strokeWidth="0.7"
            />
          ))}
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="88"
            stroke="#98A2B3"
            strokeWidth="0.8"
          />
          <line
            x1="12"
            y1="88"
            x2="92"
            y2="88"
            stroke="#98A2B3"
            strokeWidth="0.8"
          />
          <polyline
            points={coordinates.join(" ")}
            fill="none"
            stroke="#248A3D"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {coordinates.map((coordinate, index) => {
            const [cx, cy] = coordinate.split(",");
            const point = points[index];
            return (
              <circle
                key={coordinate}
                cx={cx}
                cy={cy}
                r="2.4"
                fill={index === coordinates.length - 1 ? "#248A3D" : "#FFFFFF"}
                stroke="#248A3D"
                strokeWidth="1.3"
              >
                <title>
                  {point.durationMinutes} min · {point.trigger} · {point.engagement}%
                </title>
              </circle>
            );
          })}
          {coordinates.map((coordinate, index) => {
            const shouldLabel = index < 2 || index === coordinates.length - 1;
            if (!shouldLabel) return null;
            const [cx, cy] = coordinate.split(",");
            return (
              <text
                key={`trigger-${coordinate}`}
                x={cx}
                y={Math.max(12, Number(cy) - 5)}
                textAnchor="middle"
                fontSize="3"
                fontWeight="600"
                fill="#475467"
              >
                {shortTrigger(points[index].trigger)}
              </text>
            );
          })}
          <text x="2" y="12" fontSize="4" fill="#667085">
            100%
          </text>
          <text x="4" y="35" fontSize="4" fill="#667085">
            75%
          </text>
          <text x="4" y="59" fontSize="4" fill="#667085">
            50%
          </text>
          <text x="4" y="89" fontSize="4" fill="#667085">
            0%
          </text>
          <text x="43" y="98" fontSize="4" fill="#667085">
            Duration (minutes)
          </text>
        </svg>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Engagement triggers">
          {points.map((point) => (
            <span
              key={`${point.durationMinutes}-${point.trigger}`}
              className="inline-flex items-center gap-1 rounded-md border border-[#DCE4EA] bg-white px-2 py-1 text-[9px] font-medium text-[#667085]"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#248A3D]" />
              {point.durationMinutes}m · {point.trigger}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function PriorityMap({ categories: items }: { categories: Category[] }) {
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-4">
        <h2 className="font-semibold">Priority mapping</h2>
        <p className="mt-1 text-xs text-[#667085]">
          Relative coverage against relative client need.
        </p>
      </div>
      <div className="relative ml-8 h-[260px] overflow-visible border-b border-l border-[#98A2B3] bg-[linear-gradient(to_right,#E5EAF0_1px,transparent_1px),linear-gradient(to_bottom,#E5EAF0_1px,transparent_1px)] bg-[size:25%_25%]">
        <div className="absolute bottom-0 right-0 h-1/2 w-1/2 bg-[#FFF1F2] opacity-70" />
        <div className="absolute bottom-2 right-2 rounded bg-[#FFF1F2] px-1.5 py-1 text-[8px] font-bold uppercase leading-3 text-[#A41329]">
          Risk zone
          <br />
          High need · low coverage
        </div>
        <div className="absolute left-2 top-2 text-[8px] font-semibold uppercase text-[#98A2B3]">
          Lower need · higher coverage
        </div>
        <div className="absolute right-2 top-2 text-[8px] font-semibold uppercase text-[#667085]">
          High need · higher coverage
        </div>
        <div className="absolute -left-9 top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[10px] font-semibold text-[#667085]">
          Relative coverage
        </div>
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-[#667085]">
          Relative needs
        </div>
        {items.map((category) => (
          <div
            key={category.id}
            title={`${category.label}: ${category.need}% need, ${category.coverage}% coverage`}
            className="absolute flex h-6 w-6 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border-2 border-white shadow-md"
            style={{
              left: `${category.need}%`,
              bottom: `${category.coverage}%`,
              backgroundColor: category.color,
            }}
          >
            <category.icon size={12} className="text-white" />
          </div>
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#475467]"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: category.color }}
            />
            {category.shortLabel}
          </div>
        ))}
      </div>
    </section>
  );
}

function UnderstandingChart({
  categories: items,
  summary,
  timestamp,
}: {
  categories: Category[];
  summary: string;
  timestamp: string;
}) {
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Relative understanding</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Thresholds show whether each area is ready to proceed or needs
            clarification.
          </p>
        </div>
        <div className="text-right">
          <DataTimestamp timestamp={timestamp} />
          <span className="mt-1 block text-[10px] font-semibold text-[#667085]">
            {items.length}/5 active
          </span>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((category) => {
          const Icon = category.icon;
          const threshold = coverageThreshold(category.understanding);
          return (
            <div key={category.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Icon size={14} style={{ color: category.color }} />
                  {category.label}
                </div>
                <div className="flex items-center gap-1.5">
                  <FollowUpStatusIcon value={category.understanding} />
                  <span
                    className={`text-xs font-bold ${statusText(category.understanding)}`}
                  >
                    {category.understanding}%
                  </span>
                  <span
                    className={`hidden text-[8px] font-bold uppercase sm:inline ${statusText(category.understanding)}`}
                  >
                    {threshold.label}
                  </span>
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[#EEF1F4]">
                <div
                  className={`h-full rounded-full ${statusColor(category.understanding)}`}
                  style={{ width: `${category.understanding}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {items.length === 0 && (
        <div className="rounded-lg bg-[#F4F7F9] p-5 text-center text-xs text-[#667085]">
          Understanding appears after a category is discussed.
        </div>
      )}
      <div className="mt-4 border-t border-[#E5EAF0] pt-3 text-[10px] leading-4 text-[#344054]">
        <span className="font-bold text-sci">Dynamic readout:</span> {summary}
      </div>
    </section>
  );
}

function Ring({ value }: { value: number }) {
  return (
    <div
      className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(${statusHex(value)} ${value}%, #E8EDF1 0)`,
      }}
    >
      <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-white text-sm font-bold">
        {value}%
      </div>
    </div>
  );
}

function ProgressSources({
  selected,
  total,
  hasTranscript,
  hasNotes,
  learningPointCount,
}: {
  selected: number;
  total: number;
  hasTranscript: boolean;
  hasNotes: boolean;
  learningPointCount: number;
}) {
  return (
    <details className="mt-4 rounded-lg border border-[#D9E4EC] bg-[#F6F9FB] p-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-bold uppercase text-[#475467]">
        <span className="flex items-center gap-2">
          <Info size={13} className="text-sci" /> Sources & calculation
        </span>
        <ChevronDown size={14} className="text-[#667085]" />
      </summary>
      <div className="mt-3 space-y-2">
        <SourceRow
          icon={ListChecks}
          label="Advisor checklist"
          value={`${selected} of ${total} planned topics marked`}
        />
        <SourceRow
          icon={Mic}
          label="Session transcript"
          value={hasTranscript ? "Available" : "No transcript captured"}
        />
        <SourceRow
          icon={NotebookPen}
          label="Client notes"
          value={hasNotes ? "Available" : "No notes captured"}
        />
        <SourceRow
          icon={Sparkles}
          label="ClariFi learning points"
          value={`${learningPointCount} extracted signals`}
        />
      </div>
      <p className="mt-3 border-t border-[#D9E4EC] pt-2 text-[10px] leading-4 text-[#667085]">
        Discussion coverage = checklist topics marked ÷ {total}. Understanding
        counts come from learning points extracted from the transcript and
        notes. When none exist, unresolved checklist topics are shown as needing
        attention.
      </p>
    </details>
  );
}

function SourceRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[18px_1fr_auto] items-center gap-2 text-[10px]">
      <Icon size={13} className="text-[#667085]" />
      <span className="font-semibold text-[#344054]">{label}</span>
      <span className="text-right font-medium text-[#667085]">{value}</span>
    </div>
  );
}

function Signal({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "amber";
}) {
  const color =
    tone === "green"
      ? "text-[#248A3D] bg-[#EAF7EE]"
      : "text-[#B26700] bg-[#FFF4DF]";
  return (
    <div className={`rounded-md px-3 py-2 ${color}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] font-semibold">{label}</div>
    </div>
  );
}

function buildNeeds(text: string) {
  const needs = [
    {
      value: "Hospital bill affordability",
      why: "Linked to: hospital-cover clarification",
      keywords: ["hospital", "bill", "ward", "shield"],
    },
    {
      value: "Income continuity during recovery",
      why: "Linked to: freelance income discussion",
      keywords: ["income", "salary", "work", "freelance"],
    },
    {
      value: "Critical illness cash support",
      why: "Linked to: no lump-sum cover recorded",
      keywords: ["critical", "lump", "serious illness"],
    },
    {
      value: "Clear exclusions and claim costs",
      why: "Linked to: deductible and exclusions review",
      keywords: ["exclude", "deductible", "co-insurance", "pay"],
    },
    {
      value: "Long-term family protection",
      why: "Linked to: family continuity check",
      keywords: ["family", "life insurance", "dependent"],
    },
  ];
  return needs
    .map((need) => ({
      ...need,
      score:
        1 + need.keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((need) => `${need.value}|${need.why}`);
}

function statusColor(value: number) {
  const tone = coverageThreshold(value).tone;
  if (tone === "green") return "bg-[#248A3D]";
  if (tone === "amber") return "bg-[#D69200]";
  return "bg-[#C8102E]";
}

function statusText(value: number) {
  const tone = coverageThreshold(value).tone;
  if (tone === "green") return "text-[#248A3D]";
  if (tone === "amber") return "text-[#B26700]";
  return "text-[#C8102E]";
}

function statusHex(value: number) {
  const tone = coverageThreshold(value).tone;
  if (tone === "green") return "#248A3D";
  if (tone === "amber") return "#D69200";
  return "#C8102E";
}

function formatDelta(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function shortTrigger(value: string) {
  return value.split(" ").slice(0, 2).join(" ");
}

function deltaText(value: number) {
  if (value > 0) return "text-[#248A3D]";
  if (value < 0) return "text-[#C8102E]";
  return "text-[#667085]";
}
