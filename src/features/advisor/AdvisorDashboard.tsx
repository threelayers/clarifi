import {
  ArrowRight,
  Baby,
  Banknote,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Download,
  HeartPulse,
  Home,
  Info,
  ListChecks,
  MessageSquareText,
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
import { useState } from "react";
import { myInfoSections } from "@/domain/sessionData";
import { refineProductSuggestions } from "@/services/clarifiApi";
import type {
  AdvisorMessage,
  CoverageItem,
  DecisionOption,
  ProductSuggestionCatalog,
  Understanding,
} from "@/types/clarifi";
import { exportAdvisorReport } from "./exportAdvisorReport";

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

type Category = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  keywords: string[];
  need: number;
  coverage: number;
  understanding: number;
};

const categories: Category[] = [
  {
    id: "life",
    label: "Life insurance",
    shortLabel: "Life",
    icon: UserRound,
    keywords: [
      "life insurance",
      "dependant",
      "dependent",
      "family protection",
      "death benefit",
    ],
    need: 48,
    coverage: 0,
    understanding: 42,
  },
  {
    id: "investment",
    label: "Investment-linked policy",
    shortLabel: "Investment-linked",
    icon: TrendingUp,
    keywords: ["investment", "investment-linked", "ilp", "fund", "returns"],
    need: 34,
    coverage: 0,
    understanding: 31,
  },
  {
    id: "critical",
    label: "Critical illness",
    shortLabel: "Critical illness",
    icon: HeartPulse,
    keywords: [
      "critical illness",
      "lump-sum",
      "lump sum",
      "serious illness",
      "rider",
    ],
    need: 76,
    coverage: 0,
    understanding: 54,
  },
  {
    id: "shield",
    label: "Integrated Shield Plan",
    shortLabel: "Shield plan",
    icon: ShieldCheck,
    keywords: [
      "hospital",
      "hospitalisation",
      "shield",
      "medishield",
      "ward",
      "surgery",
    ],
    need: 88,
    coverage: 72,
    understanding: 74,
  },
  {
    id: "retirement",
    label: "Retirement plan",
    shortLabel: "Retirement",
    icon: CalendarClock,
    keywords: ["retirement", "retire", "later life", "annuity", "pension"],
    need: 42,
    coverage: 0,
    understanding: 26,
  },
];

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

export function AdvisorDashboard(props: AdvisorDashboardProps) {
  const [dashboardTab, setDashboardTab] = useState<
    "profile" | "engagement" | "products"
  >("profile");
  const [isExporting, setIsExporting] = useState(false);
  const sessionText = [
    props.sessionTranscript,
    props.clientNotes,
    ...props.messages.map((message) => message.text),
    ...props.selectedDecisionIds,
  ]
    .join(" ")
    .toLowerCase();
  const engagedCategories = categories.filter(
    (category) =>
      category.id === "shield" ||
      category.keywords.some((keyword) => sessionText.includes(keyword)),
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
  const suggestions = rankSuggestions(sessionText);
  const engagement = buildEngagementSeries(sessionText);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAdvisorReport({
        coverageItems: props.coverageItems,
        selectedCoverageIds: props.selectedCoverageIds,
        decisionOptions: props.decisionOptions,
        selectedDecisionIds: props.selectedDecisionIds,
        coverageProfile: categories.map(({ label, coverage }) => ({
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
        <ProfileDashboard categories={categories} />
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
          {...props}
        />
      )}

      {dashboardTab === "products" && (
        <ProductSuggestionsDashboard
          suggestions={suggestions}
          clientNotes={props.clientNotes}
          sessionTranscript={props.sessionTranscript}
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

function ProfileDashboard({ categories: items }: { categories: Category[] }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="flex items-center gap-3 border-b border-[#E5EAF0] pb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F3FA] text-lg font-bold text-sci">
            TL
          </div>
          <div>
            <h2 className="font-semibold">Tan Li Wen</h2>
            <p className="mt-0.5 text-xs text-[#667085]">Individual profile</p>
          </div>
        </div>
        <div className="mt-2 divide-y divide-[#E5EAF0]">
          {profileFields.map((field) => {
            const Icon = profileIcons[field.label];
            return (
              <div key={field.label} className="flex items-center gap-3 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#F0F5F8] text-sci">
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
        <div className="mt-4 rounded-lg bg-[#F4F7F9] px-3 py-2.5 text-[10px] leading-4 text-[#667085]">
          Simulated MyInfo and client-declared profile used for this POC.
        </div>
      </section>

      <CoveragePortfolio categories={items} />
    </div>
  );
}

type EngagementDashboardProps = AdvisorDashboardProps & {
  needs: string[];
  engagement: number[];
  engagedCategories: Category[];
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
    engagement.reduce((sum, value) => sum + value, 0) /
      Math.max(engagement.length, 1),
  );
  const spokenWords = sessionTranscript
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const averageDuration = spokenWords
    ? Math.max(1, Math.round((spokenWords / 130) * 10) / 10)
    : 18.4;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Client needs & engagement</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Conversation priorities and understanding across relevant policy
            areas.
          </p>
        </div>
        <div className="grid gap-4 2xl:grid-cols-[1.2fr_.8fr]">
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase text-[#667085]">
              Top 3 needs statement
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {needs.map((need, index) => (
                <div
                  key={need}
                  className="min-h-[112px] rounded-lg border border-[#E5EAF0] bg-[#F8FAFB] p-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-xs font-bold text-sci shadow-sm">
                    {index + 1}
                  </span>
                  <div className="mt-3 text-xs font-semibold leading-5 text-[#1D2939]">
                    {need}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-[10px] font-bold uppercase text-[#667085]">
              Engagement level
            </div>
            <div className="grid gap-2 sm:grid-cols-2 2xl:grid-cols-1">
              <MetricCard
                label="Avg. conversation relativity"
                value={`${averageRelativity}%`}
                detail="Relevant session content"
                icon={Target}
              />
              <MetricCard
                label="Avg. conversation duration"
                value={`${averageDuration} min`}
                detail="Estimated from captured speech"
                icon={CalendarClock}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
          <h2 className="font-semibold">Engagement over time</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Conversation relativity against duration.
          </p>
          <div className="mt-4">
            <EngagementChart points={engagement} />
          </div>
        </section>
        <PriorityMap categories={categories} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <UnderstandingChart categories={engagedCategories} />
        <FollowUpAreas
          learningPoints={learningPoints}
          coverageItems={coverageItems}
          selectedIds={selectedCoverageIds}
        />
      </div>

      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <h2 className="font-semibold">Session progress</h2>
        <div className="mt-4 grid gap-5 xl:grid-cols-[auto_1fr] xl:items-start">
          <div className="flex items-center gap-4">
            <Ring value={coverageProgress} />
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
}: {
  suggestions: Category[];
  clientNotes: string;
  sessionTranscript: string;
}) {
  const [instruction, setInstruction] = useState("");
  const [catalog, setCatalog] = useState(productCatalog);
  const [updateMessage, setUpdateMessage] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const orderedCategories = [
    ...suggestions,
    ...categories.filter(
      (category) => !suggestions.some((item) => item.id === category.id),
    ),
  ];

  const regenerate = async () => {
    const request = instruction.trim();
    if (!request) return;
    setIsRegenerating(true);
    setUpdateMessage("");
    try {
      const result = await refineProductSuggestions(request, catalog, {
        clientNotes,
        sessionTranscript,
      });
      setCatalog(result.catalog);
      setUpdateMessage(result.summary);
      setInstruction("");
    } catch (error) {
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
        <div className="flex items-center gap-2 text-xs font-semibold text-[#344054]">
          <WandSparkles size={16} className="text-sci" /> Refine product
          suggestions
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
          <p className="mt-2 text-[10px] font-medium text-[#248A3D]">
            {updateMessage}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
        <div className="mb-4">
          <h2 className="font-semibold">Product suggestions</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Icon-categorised pathways based on conversation context and advisor
            input.
          </p>
          <span className="mt-2 inline-flex rounded-md bg-[#F1EDFF] px-2 py-1 text-[9px] font-bold uppercase text-[#6F42C1]">
            Illustrative POC catalog
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
          {orderedCategories.map((category, categoryIndex) => {
            const Icon = category.icon;
            return (
              <div
                key={category.id}
                className="overflow-hidden rounded-lg border border-[#DCE4EA] bg-[#F8FAFB]"
              >
                <div className="border-b border-[#DCE4EA] bg-white p-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#E8F3FA] text-sci">
                    <Icon size={18} />
                  </div>
                  <div className="mt-2 text-xs font-semibold leading-4">
                    {category.label}
                  </div>
                  {categoryIndex < 3 && (
                    <div className="mt-1 text-[9px] font-bold uppercase text-sci">
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
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-white text-[#667085] shadow-sm">
                        <Icon size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold leading-4 text-[#1D2939]">
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
}: {
  learningPoints: Understanding[];
  coverageItems: CoverageItem[];
  selectedIds: string[];
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
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold">Follow-up areas</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Priority comparison grouped by discussion scheme.
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-semibold text-[#667085]">
          Higher = revisit sooner
        </span>
      </div>
      <div className="space-y-4">
        {areas.map(({ item, scheme, priority }) => (
          <div key={item.id}>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-[#344054]">
                  {item.label}
                </div>
                <div
                  className="mt-0.5 text-[9px] font-bold uppercase"
                  style={{ color: scheme.color }}
                >
                  {scheme.category}
                </div>
              </div>
              <span className="text-xs font-bold text-[#475467]">
                {priority}%
              </span>
            </div>
            <div className="relative h-2 rounded-full bg-[#E9EDF1]">
              <div
                className="h-full rounded-full opacity-75"
                style={{ width: `${priority}%`, backgroundColor: scheme.color }}
              />
              <span
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_1px_5px_rgba(0,0,0,.22)]"
                style={{ left: `${priority}%`, backgroundColor: scheme.color }}
                aria-hidden="true"
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-[#E5EAF0] pt-3 text-[9px] font-semibold text-[#8A94A3]">
        <span>0 · Lower priority</span>
        <span>100 · Higher priority</span>
      </div>
    </section>
  );
}

function CoveragePortfolio({ categories: items }: { categories: Category[] }) {
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-4">
        <h2 className="font-semibold">Current coverage profile</h2>
        <p className="mt-1 text-xs text-[#667085]">
          Recorded protection as a share of profile-indicated need.
        </p>
      </div>
      <div className="space-y-3">
        {items.map((category) => {
          const Icon = category.icon;
          return (
            <div
              key={category.id}
              className="grid grid-cols-[28px_1fr_38px] items-center gap-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#F0F4F7] text-[#475467]">
                <Icon size={15} />
              </div>
              <div>
                <div className="mb-1.5 text-[11px] font-semibold">
                  {category.label}
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#EEF1F4]">
                  <div
                    className={`h-full rounded-full ${statusColor(category.coverage)}`}
                    style={{ width: `${category.coverage}%` }}
                  />
                </div>
              </div>
              <div
                className={`text-right text-xs font-bold ${statusText(category.coverage)}`}
              >
                {category.coverage}%
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 border-t border-[#E5EAF0] pt-3 text-[10px] leading-4 text-[#667085]">
        Percentage = recorded coverage scope ÷ profile-indicated need.
        Categories without a recorded policy are shown as 0%.
      </p>
    </section>
  );
}

function ProductPathways({ suggestions }: { suggestions: Category[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const descriptors: Record<string, string> = {
    shield: "Hospital expense protection",
    critical: "Lump-sum recovery support",
    life: "Family financial protection",
    retirement: "Long-term income planning",
    investment: "Protection with market exposure",
  };
  const pathwayDetails: Record<
    string,
    { signal: string; need: string; intent: string }
  > = {
    shield: {
      signal: "Hospital bill uncertainty",
      need: "Medical expense protection",
      intent: "Clarify eligible hospital costs",
    },
    critical: {
      signal: "No recorded lump-sum cover",
      need: "Recovery cash support",
      intent: "Explore critical illness protection",
    },
    life: {
      signal: "No recorded life cover",
      need: "Family financial continuity",
      intent: "Explore dependant protection",
    },
    retirement: {
      signal: "Long-term income goal",
      need: "Future income continuity",
      intent: "Explore retirement planning",
    },
    investment: {
      signal: "Growth and protection interest",
      need: "Long-term wealth participation",
      intent: "Explore linked protection",
    },
  };
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">AI-ranked product pathways</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Visual categories prepared from current session context.
          </p>
        </div>
        <span className="flex items-center gap-1 rounded-md bg-[#F1EDFF] px-2 py-1 text-[10px] font-bold text-[#6F42C1]">
          <Sparkles size={11} /> PREDICTION POC
        </span>
      </div>
      <div className="space-y-3">
        {suggestions.map((category, index) => {
          const Icon = category.icon;
          const ranks = ["Primary", "Explore", "Monitor"];
          const expanded = expandedId === category.id;
          const detail = pathwayDetails[category.id];
          return (
            <div key={category.id}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : category.id)}
                className={`flex min-h-[86px] w-full items-center gap-3 rounded-lg border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sci focus-visible:ring-offset-2 ${
                  expanded
                    ? "border-[#9CCDFD] bg-[#F2F8FE]"
                    : "border-[#E5EAF0] bg-[#F8FAFB] hover:border-[#C5D9EA] hover:bg-white"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-sci shadow-sm">
                  <Icon size={21} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase text-sci">
                    {ranks[index]}
                  </div>
                  <div className="mt-0.5 truncate text-xs font-semibold">
                    {category.label}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[#667085]">
                    {descriptors[category.id]}
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#667085]">
                  <ChevronDown
                    size={17}
                    className={`transition-transform ${expanded ? "rotate-180" : ""}`}
                  />
                </div>
              </button>
              {expanded && (
                <ProductPathwayDetail
                  category={category}
                  descriptor={descriptors[category.id]}
                  detail={detail}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductPathwayDetail({
  category,
  descriptor,
  detail,
}: {
  category: Category;
  descriptor: string;
  detail: { signal: string; need: string; intent: string };
}) {
  const ProductIcon = category.icon;
  return (
    <div className="mt-2 rounded-lg border border-[#CFE2F3] bg-white p-4 shadow-[0_8px_24px_rgba(30,64,96,.06)]">
      <div className="grid gap-3 border-b border-[#E5EAF0] pb-4 sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase text-[#667085]">
            Product pathway
          </div>
          <div className="mt-1 text-sm font-semibold">{category.label}</div>
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase text-[#667085]">
            Discussion intent
          </div>
          <div className="mt-1 text-sm font-semibold">{descriptor}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-3 text-[10px] font-bold uppercase text-[#667085]">
          Why it surfaced
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <FlowNode
            icon={MessageSquareText}
            eyebrow="Session signal"
            label={detail.signal}
          />
          <FlowArrow />
          <FlowNode icon={Target} eyebrow="Client need" label={detail.need} />
          <FlowArrow />
          <FlowNode
            icon={ProductIcon}
            eyebrow="Product"
            label={category.label}
            active
          />
          <FlowArrow />
          <FlowNode
            icon={CheckCircle2}
            eyebrow="Intent"
            label={detail.intent}
          />
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-4 text-[#667085]">
        Context signal only. Suitability and recommendations remain with the
        licensed advisor.
      </p>
    </div>
  );
}

function FlowNode({
  icon: Icon,
  eyebrow,
  label,
  active = false,
}: {
  icon: LucideIcon;
  eyebrow: string;
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[92px] min-w-0 flex-1 flex-col justify-between rounded-lg border p-3 ${
        active
          ? "border-[#9CCDFD] bg-[#EEF7FF]"
          : "border-[#E5EAF0] bg-[#F8FAFB]"
      }`}
    >
      <Icon size={18} className={active ? "text-sci" : "text-[#667085]"} />
      <div className="mt-3">
        <div className="text-[9px] font-bold uppercase text-[#8A94A3]">
          {eyebrow}
        </div>
        <div className="mt-1 text-[10px] font-semibold leading-4 text-[#344054]">
          {label}
        </div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex shrink-0 justify-center text-[#98A2B3]">
      <ArrowRight size={16} className="rotate-90 sm:rotate-0" />
    </div>
  );
}

function EngagementChart({ points }: { points: number[] }) {
  const coordinates = points.map((point, index) => {
    const x = 12 + index * (76 / Math.max(points.length - 1, 1));
    const y = 88 - point * 0.72;
    return `${x},${y}`;
  });
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase text-[#667085]">
          Engagement level
        </div>
        <div className="text-xs font-bold text-[#248A3D]">
          {points.at(-1)}% relevant
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
            return (
              <circle
                key={coordinate}
                cx={cx}
                cy={cy}
                r="2.4"
                fill={index === coordinates.length - 1 ? "#248A3D" : "#FFFFFF"}
                stroke="#248A3D"
                strokeWidth="1.3"
              />
            );
          })}
          <text x="2" y="12" fontSize="4" fill="#667085">
            100%
          </text>
          <text x="4" y="89" fontSize="4" fill="#667085">
            0%
          </text>
          <text x="43" y="98" fontSize="4" fill="#667085">
            Duration (minutes)
          </text>
        </svg>
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
      <div className="relative ml-8 h-[260px] border-b border-l border-[#98A2B3] bg-[linear-gradient(to_right,#E5EAF0_1px,transparent_1px),linear-gradient(to_bottom,#E5EAF0_1px,transparent_1px)] bg-[size:25%_25%]">
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
            className={`absolute h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white shadow-md ${statusColor(category.coverage - category.need + 55)}`}
            style={{
              left: `${category.need}%`,
              bottom: `${category.coverage}%`,
            }}
          />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
        {items.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#475467]"
          >
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusColor(category.coverage - category.need + 55)}`}
            />
            {category.shortLabel}
          </div>
        ))}
      </div>
    </section>
  );
}

function UnderstandingChart({ categories: items }: { categories: Category[] }) {
  return (
    <section className="rounded-lg border border-[#DCE4EA] bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Relative understanding</h2>
          <p className="mt-1 text-xs text-[#667085]">
            Only categories engaged during the session are shown.
          </p>
        </div>
        <span className="text-[10px] font-semibold text-[#667085]">
          {items.length}/5 active
        </span>
      </div>
      <div className="space-y-4">
        {items.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.id}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Icon size={14} className="text-[#667085]" />
                  {category.label}
                </div>
                <span
                  className={`text-xs font-bold ${statusText(category.understanding)}`}
                >
                  {category.understanding}%
                </span>
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
    <div className="mt-4 rounded-lg border border-[#D9E4EC] bg-[#F6F9FB] p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-[#475467]">
        <Info size={13} className="text-sci" /> Sources & calculation
      </div>
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
    </div>
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
      keywords: ["hospital", "bill", "ward", "shield"],
    },
    {
      value: "Income continuity during recovery",
      keywords: ["income", "salary", "work", "freelance"],
    },
    {
      value: "Critical illness cash support",
      keywords: ["critical", "lump", "serious illness"],
    },
    {
      value: "Clear exclusions and claim costs",
      keywords: ["exclude", "deductible", "co-insurance", "pay"],
    },
    {
      value: "Long-term family protection",
      keywords: ["family", "life insurance", "dependent"],
    },
  ];
  return needs
    .map((need) => ({
      ...need,
      score: need.keywords.filter((keyword) => text.includes(keyword)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((need) => need.value);
}

function rankSuggestions(text: string) {
  return [...categories]
    .map((category) => ({
      category,
      score:
        category.keywords.filter((keyword) => text.includes(keyword)).length +
        (category.id === "shield" ? 2 : 0),
    }))
    .sort((a, b) => b.score - a.score || b.category.need - a.category.need)
    .slice(0, 3)
    .map((item) => item.category);
}

function buildEngagementSeries(text: string) {
  const relevantTerms = [
    "hospital",
    "income",
    "coverage",
    "policy",
    "critical",
    "claim",
    "advisor",
    "plan",
    "insurance",
  ];
  const chunks = text
    .split(/[.!?\n]+/)
    .filter(Boolean)
    .slice(-6);
  if (chunks.length < 2) return [52, 61, 68, 74, 79, 83];
  return chunks.map((chunk, index) =>
    Math.min(
      96,
      42 +
        index * 5 +
        relevantTerms.filter((term) => chunk.includes(term)).length * 9,
    ),
  );
}

function statusColor(value: number) {
  if (value >= 65) return "bg-[#248A3D]";
  if (value >= 35) return "bg-[#D69200]";
  return "bg-[#C8102E]";
}

function statusText(value: number) {
  if (value >= 65) return "text-[#248A3D]";
  if (value >= 35) return "text-[#B26700]";
  return "text-[#C8102E]";
}

function statusHex(value: number) {
  if (value >= 65) return "#248A3D";
  if (value >= 35) return "#D69200";
  return "#C8102E";
}
