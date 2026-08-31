import {
  AlertTriangle,
  ClipboardList,
  FileText,
  Languages,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  NotebookPen,
  Quote,
  Send,
  ShieldCheck,
  Users
} from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clauses, profile } from "@/domain/policy";
import { ClariFiAiMark } from "@/shared/components/ClariFiAiMark";
import { LoadingDots } from "@/shared/components/Header";
import { compactText } from "@/shared/lib/text";
import type { ClientMessage, DecisionOption, PolicyEvidence, PreMeetingPrep, Understanding } from "@/types/clarifi";

type ClientViewProps = {
  messages: ClientMessage[];
  loading: boolean;
  onSend: (text: string) => void;
  activeClauseId: string | null;
  setActiveClauseId: (id: string) => void;
  policyFileName: string;
  preMeetingPrep: PreMeetingPrep;
  clientNotes: string;
  onClientNotesChange: (notes: string) => void;
  sessionTranscript: string;
  onSessionTranscriptChange: (transcript: string) => void;
  handwrittenNoteImage: string;
  onHandwrittenNoteImageChange: (image: string) => void;
  decisionOptions: DecisionOption[];
  selectedDecisionIds: string[];
  policyEvidence: PolicyEvidence[];
  sessionId: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const statusMeta = {
  covered: { label: "Understood well", dot: "bg-[#1E8E5A]", bg: "bg-[#F1F8F3]", border: "border-[#DCEDE3]" },
  action: { label: "Needs clarification", dot: "bg-[#C77700]", bg: "bg-[#FFF6E8]", border: "border-[#F1DFB8]" },
  not_covered: { label: "Not covered / unknown", dot: "bg-[#C8102E]", bg: "bg-[#FDECEC]", border: "border-[#F6D5D8]" }
};

const speechLanguages = [
  { label: "English", value: "en-SG" },
  { label: "Chinese", value: "zh-SG" },
  { label: "Malay", value: "ms-SG" },
  { label: "Tamil", value: "ta-SG" }
];

const SIDE_TOOLS_WIDTH_KEY = "clarifi.clientSideToolsWidth";
const SIDE_TOOLS_MIN_WIDTH = 360;
const SIDE_TOOLS_DEFAULT_WIDTH = 440;
const SIDE_TOOLS_MAX_WIDTH = 560;

const sideToolsMaxWidth = () => {
  if (typeof window === "undefined") return SIDE_TOOLS_MAX_WIDTH;
  return Math.min(SIDE_TOOLS_MAX_WIDTH, Math.max(SIDE_TOOLS_MIN_WIDTH, window.innerWidth - 640));
};

const clampSideToolsWidth = (width: number) =>
  Math.min(sideToolsMaxWidth(), Math.max(SIDE_TOOLS_MIN_WIDTH, Math.round(width)));

const savedSideToolsWidth = () => {
  if (typeof window === "undefined") return SIDE_TOOLS_DEFAULT_WIDTH;
  const saved = Number(window.localStorage.getItem(SIDE_TOOLS_WIDTH_KEY));
  return Number.isFinite(saved) ? clampSideToolsWidth(saved) : SIDE_TOOLS_DEFAULT_WIDTH;
};

export function ClientView(props: ClientViewProps) {
  const [input, setInput] = useState("");
  const [speechLang, setSpeechLang] = useState("en-SG");
  const [isListening, setIsListening] = useState(false);
  const [speechNotice, setSpeechNotice] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showSessionPlan, setShowSessionPlan] = useState(false);
  const [showExpandedNotes, setShowExpandedNotes] = useState(false);
  const [useSideTools, setUseSideTools] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1280px)").matches : false
  );
  const [sideToolsWidth, setSideToolsWidth] = useState(savedSideToolsWidth);
  const [isResizingSideTools, setIsResizingSideTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sideToolsShellRef = useRef<HTMLDivElement>(null);
  const didMountRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(props.sessionTranscript);
  const sideToolsWidthRef = useRef(sideToolsWidth);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasHistoryRef = useRef<string[]>([]);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (props.messages.length <= 1 && !props.loading) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [props.messages, props.loading]);

  useEffect(() => {
    transcriptRef.current = props.sessionTranscript;
  }, [props.sessionTranscript]);

  useEffect(() => {
    sideToolsWidthRef.current = sideToolsWidth;
  }, [sideToolsWidth]);

  useEffect(() => {
    if (!isResizingSideTools) return;

    const onMove = (event: globalThis.PointerEvent) => {
      const left = sideToolsShellRef.current?.getBoundingClientRect().left || 0;
      const nextWidth = clampSideToolsWidth(event.clientX - left);
      sideToolsWidthRef.current = nextWidth;
      setSideToolsWidth(nextWidth);
    };
    const onUp = () => {
      setIsResizingSideTools(false);
      window.localStorage.setItem(SIDE_TOOLS_WIDTH_KEY, String(sideToolsWidthRef.current));
    };

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [isResizingSideTools]);

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
    },
    []
  );

  useEffect(() => {
    const render = () => renderCanvas(props.handwrittenNoteImage);
    render();
    window.addEventListener("resize", render);
    return () => window.removeEventListener("resize", render);
  }, [props.handwrittenNoteImage, sideToolsWidth]);

  useEffect(() => {
    if (!showExpandedNotes) return;
    const frame = window.requestAnimationFrame(() => renderCanvas(props.handwrittenNoteImage));
    return () => window.cancelAnimationFrame(frame);
  }, [props.handwrittenNoteImage, showExpandedNotes]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1280px)");
    const update = () => setUseSideTools(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const record = useMemo(() => {
    const map = new Map<string, Understanding>();
    props.messages.forEach((message) => {
      (message.understanding || []).forEach((item) => {
        if (item.point) map.set(item.point.trim().toLowerCase(), item);
      });
    });
    const order = { covered: 0, action: 1, not_covered: 2 };
    return [...map.values()].sort((a, b) => order[a.status] - order[b.status]);
  }, [props.messages]);

  const citedClauses = useMemo(() => {
    const ids: string[] = [];
    props.messages.forEach((message) => {
      (message.evidenceIds || []).forEach((id) => {
        const existing = ids.indexOf(id);
        if (existing >= 0) ids.splice(existing, 1);
        ids.unshift(id);
      });
    });
    return ids
      .map((id) => clauses.find((clause) => clause.id === id))
      .filter((clause): clause is (typeof clauses)[number] => Boolean(clause));
  }, [props.messages]);

  const relevantClause = useMemo(() => {
    if (props.activeClauseId) return clauses.find((clause) => clause.id === props.activeClauseId) || citedClauses[0];
    return citedClauses[0];
  }, [props.activeClauseId, citedClauses]);

  const selectedDecisionOptions = useMemo(
    () => props.decisionOptions.filter((option) => props.selectedDecisionIds.includes(option.id)),
    [props.decisionOptions, props.selectedDecisionIds]
  );
  const clarityCounts = useMemo(
    () => ({
      clear: record.filter((item) => item.status === "covered").length,
      clarify: record.filter((item) => item.status === "action").length,
      unknown: record.filter((item) => item.status === "not_covered").length
    }),
    [record]
  );
  const focusItems = props.preMeetingPrep.clientWidget.bullets.slice(0, 3);

  const renderCanvas = (image = "") => {
    const canvases = [canvasRef.current, expandedCanvasRef.current].filter(
      (canvas): canvas is HTMLCanvasElement => Boolean(canvas)
    );

    canvases.forEach((canvas) => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(320, rect.width || 320);
      const height = Math.max(150, rect.height || 150);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const paintBackground = () => {
        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, width, height);
        context.strokeStyle = "rgba(30, 142, 90, 0.12)";
        context.lineWidth = 1;
        for (let y = 32; y < height; y += 32) {
          context.beginPath();
          context.moveTo(0, y);
          context.lineTo(width, y);
          context.stroke();
        }
        context.strokeStyle = "#1B1B1F";
        context.lineWidth = 3;
        context.lineCap = "round";
        context.lineJoin = "round";
      };

      paintBackground();
      if (!image) return;

      const noteImage = new Image();
      noteImage.onload = () => {
        paintBackground();
        context.drawImage(noteImage, 0, 0, width, height);
      };
      noteImage.src = image;
    });
  };

  const canvasPoint = (canvas: HTMLCanvasElement, event: PointerEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const saveCanvas = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    props.onHandwrittenNoteImageChange(canvas.toDataURL("image/png"));
  };

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const point = canvasPoint(canvas, event);
    event.preventDefault();
    canvas.setPointerCapture(event.pointerId);
    canvasHistoryRef.current = [...canvasHistoryRef.current.slice(-8), canvas.toDataURL("image/png")];
    drawingRef.current = true;
    lastPointRef.current = point;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.arc(point.x, point.y, 1.5, 0, Math.PI * 2);
    context.fillStyle = "#1B1B1F";
    context.fill();
  };

  const draw = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const canvas = event.currentTarget;
    const point = canvasPoint(canvas, event);
    const previous = lastPointRef.current;
    if (!previous) return;
    event.preventDefault();
    const context = canvas.getContext("2d");
    if (!context) return;
    context.beginPath();
    context.moveTo(previous.x, previous.y);
    context.lineTo(point.x, point.y);
    context.strokeStyle = "#1B1B1F";
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
    lastPointRef.current = point;
  };

  const stopDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    saveCanvas(event.currentTarget);
  };

  const undoHandwriting = () => {
    const previous = canvasHistoryRef.current.pop();
    if (!previous) return;
    props.onHandwrittenNoteImageChange(previous);
    window.requestAnimationFrame(() => renderCanvas(previous));
  };

  const clearHandwriting = () => {
    canvasHistoryRef.current = [];
    props.onHandwrittenNoteImageChange("");
    renderCanvas("");
  };

  const appendTranscript = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const current = transcriptRef.current.trim();
    const nextTranscript = current ? `${current}\n${trimmed}` : trimmed;
    transcriptRef.current = nextTranscript;
    props.onSessionTranscriptChange(nextTranscript);
  };

  const startListening = () => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setSpeechNotice("Speech recognition is not available in this browser. Use the transcript box instead.");
      return;
    }

    recognitionRef.current?.stop();
    const recognition = new Recognition() as SpeechRecognitionLike;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLang;
    recognition.onresult = (event: any) => {
      let finalText = "";
      let nextInterim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript || "";
        if (result?.isFinal) finalText += text;
        else nextInterim += text;
      }
      if (finalText.trim()) appendTranscript(finalText);
      setInterimText(nextInterim.trim());
    };
    recognition.onerror = () => {
      setIsListening(false);
      setSpeechNotice("Microphone capture stopped. You can continue by typing into the transcript box.");
    };
    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setSpeechNotice("");
    } catch {
      setSpeechNotice("Speech recognition could not start. Check microphone permission or type the transcript manually.");
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimText("");
  };

  const persistSideToolsWidth = (width: number) => {
    const nextWidth = clampSideToolsWidth(width);
    sideToolsWidthRef.current = nextWidth;
    setSideToolsWidth(nextWidth);
    window.localStorage.setItem(SIDE_TOOLS_WIDTH_KEY, String(nextWidth));
  };

  const send = (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    props.onSend(trimmed);
    setInput("");
  };

  const sessionTools = (
    <>
      <div className="rounded-lg border border-[#E5E5EA] bg-white/58 px-3 py-3 text-xs font-medium text-[#3A3A3C] backdrop-blur-xl">
        <div className="mb-2 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sci text-[11px] font-bold text-white">
            TL
          </div>
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold text-ink">{profile.name}</div>
            <div className="truncate text-[11px] font-medium text-[#6E6E73]">28 · Freelance · PRUShield Plus</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-md border border-[#E5E5EA] bg-white/70 px-2 py-1 text-[10.5px] font-semibold text-[#3A3A3C]">
            Knowledge only
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-[#CFE7FF] bg-white/70 px-2 py-1 text-[10.5px] font-semibold text-sci">
            <span className="h-1.5 w-1.5 rounded-full bg-sciGold" /> Live check
          </span>
        </div>
      </div>

      <div className="apple-panel-quiet p-3 shadow-none">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-sci">
            <Mic size={17} /> Listening
          </div>
          <span className="rounded-md bg-[#F3F9FF] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sci">
            Session input
          </span>
          <button
            className={`ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-white transition ${
              isListening ? "bg-[#C8102E] hover:bg-[#A20C25]" : "bg-sci hover:bg-[#073B5B]"
            }`}
            onClick={isListening ? stopListening : startListening}
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>
        <div className="mb-2 flex justify-end">
          <label className="flex items-center gap-1 rounded-lg border border-[#E5E5EA] bg-white/58 px-2 py-1 text-[11px] font-semibold text-[#3A3A3C] backdrop-blur-xl">
            <Languages size={13} />
            <select
              value={speechLang}
              onChange={(event) => setSpeechLang(event.target.value)}
              className="bg-transparent text-[11px] font-bold outline-none"
            >
              {speechLanguages.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <textarea
          value={props.sessionTranscript}
          onChange={(event) => props.onSessionTranscriptChange(event.target.value)}
          rows={useSideTools ? 3 : 3}
          placeholder="Add or correct the consultation transcript..."
          className="w-full resize-none rounded-lg border border-[#D2D2D7] bg-white/72 px-3 py-2 text-[12.5px] font-medium leading-5 text-[#3A3A3C] outline-none backdrop-blur-xl transition placeholder:text-[#8E8E93] focus:border-sci focus:bg-white focus:ring-4 focus:ring-[#D6EBFF]"
        />
        {(interimText || speechNotice) && (
          <div className="mt-2 rounded-md border border-[#E5E5EA] bg-white/58 px-3 py-2 text-[11px] font-medium leading-5 text-[#3A3A3C] backdrop-blur-xl">
            {interimText || speechNotice}
          </div>
        )}
      </div>

      <div className="apple-panel-quiet p-3 shadow-none">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#248A3D]">
              <NotebookPen size={17} /> My notes
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-[#6E6E73]">Private context for clarity</div>
          </div>
          <div className="rounded-md border border-[#CDEDD6] bg-[#F2FBF5] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#248A3D]">
            iPad ready
          </div>
        </div>
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">Write or type</div>
            <div className="flex gap-1">
              <button
                className="rounded-md border border-[#CDEDD6] bg-white/70 px-2 py-1 text-[10px] font-semibold text-[#248A3D] hover:border-[#248A3D]"
                onClick={undoHandwriting}
                type="button"
              >
                Undo
              </button>
              <button
                className="rounded-md border border-[#FFD1D1] bg-white/70 px-2 py-1 text-[10px] font-semibold text-[#D70015] hover:border-[#D70015]"
                onClick={clearHandwriting}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="relative">
            <canvas
              ref={canvasRef}
              className={`${useSideTools ? "h-[156px]" : "h-[112px]"} w-full touch-none rounded-lg border border-[#D2D2D7] bg-white/85 shadow-[inset_0_0_0_1px_rgba(0,0,0,.025)]`}
              style={{
                backgroundImage: "linear-gradient(to bottom, transparent 30px, rgba(30, 142, 90, 0.12) 31px)",
                backgroundSize: "100% 32px"
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              aria-label="Handwritten client notes canvas"
            />
            <button
              type="button"
              className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-[#CDEDD6] bg-white/90 px-2 py-1 text-[10.5px] font-bold text-[#248A3D] shadow-[0_8px_24px_rgba(0,0,0,.10)] backdrop-blur-xl transition hover:border-[#248A3D] hover:bg-white"
              onClick={() => setShowExpandedNotes(true)}
              aria-label="Expand handwriting notes"
            >
              <Maximize2 size={12} /> Expand
            </button>
          </div>
          <div className="mt-1 text-[10.5px] font-medium leading-4 text-[#6E6E73]">Saved to AI context.</div>
        </div>
        <textarea
          value={props.clientNotes}
          onChange={(event) => props.onClientNotesChange(event.target.value)}
          rows={3}
          placeholder="Optional typed notes or handwriting clarification..."
          className="w-full resize-none rounded-lg border border-[#D2D2D7] bg-white/72 px-3 py-2 text-[12.5px] font-medium leading-5 text-[#3A3A3C] outline-none backdrop-blur-xl transition placeholder:text-[#8E8E93] focus:border-[#248A3D] focus:bg-white focus:ring-4 focus:ring-[#DDF6E6]"
        />
      </div>

      {props.messages.length <= 1 && (
        <div className="rounded-lg border border-[#A7D4FF] bg-[#E4F2FF] px-3 py-2 text-xs font-medium text-[#3A3A3C] shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_8px_22px_rgba(0,113,227,.07)] backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sci">
            <ClipboardList size={17} /> Focus
            <span className="rounded-md border border-[#DCEEFF] bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">
              Read-only
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {focusItems.map((bullet) => (
              <span key={bullet} className="rounded-md border border-[#B8DCFF] bg-white/90 px-2.5 py-1.5 text-[12px] font-semibold shadow-[0_6px_18px_rgba(0,113,227,.06)]" title={bullet}>
                {compactText(bullet, useSideTools ? 26 : 34)}
              </span>
            ))}
          </div>
        </div>
      )}

      <details className="rounded-lg border border-[#C5D3DD] bg-[#E9F0F5] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72),0_8px_24px_rgba(0,0,0,.05)] backdrop-blur-xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-ink">
          <span className="flex items-center gap-2">
            <ShieldCheck size={17} className="text-sci" /> Clarity summary
          </span>
          <span className="rounded-md border border-[#DDE9F0] bg-white/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">Optional</span>
        </summary>
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[#BFDCCB] bg-[#E6F5EA] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72)]">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#6E6E73]">Learning points</div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                ["bg-[#1E8E5A]", "Clear", clarityCounts.clear],
                ["bg-[#C77700]", "Clarify", clarityCounts.clarify],
                ["bg-[#C8102E]", "Unknown", clarityCounts.unknown]
              ].map(([dot, label, count]) => (
                <div key={label} className="rounded-md border border-white/80 bg-white/90 px-2 py-2 text-center text-[11px] font-semibold text-[#3A3A3C] shadow-[0_6px_18px_rgba(0,0,0,.035)]">
                  <span className={`mx-auto mb-1 block h-1.5 w-1.5 rounded-full ${dot}`} />
                  {label} {count}
                </div>
              ))}
            </div>
            {record.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {record.slice(0, 2).map((item) => {
                  const meta = statusMeta[item.status];
                  return (
                    <div key={item.point} className={`rounded-md border px-2 py-1.5 text-[12px] font-medium leading-5 ${meta.bg} ${meta.border}`} title={item.point}>
                      {compactText(item.point, 62)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-[#E2C184] bg-[#FFF0D7] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,.72)]">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-[#6E6E73]">
                <Quote size={13} /> Policy quote
              </div>
              <span className="rounded-md border border-[#E8DCCB] bg-white/80 px-2 py-1 text-[11px] font-semibold text-[#3A3A3C]" title={props.policyFileName || "No advisor policy uploaded"}>
                {props.policyFileName ? "Verified PDF" : "PDF pending"}
              </span>
            </div>
            {props.policyEvidence.length > 0 ? (
              <a
                className="block w-full rounded-md border border-[#B9D7E8] bg-[#F0F8FC] p-2 text-left"
                href={`/api/policies/${props.sessionId}/documents/${props.policyEvidence[0].documentId}/download`}
                target="_blank"
                rel="noreferrer"
                title={`${props.policyEvidence[0].fileName}, page ${props.policyEvidence[0].pageNumber}`}
              >
                <div className="mb-1 text-[11px] font-semibold text-sci">Page {props.policyEvidence[0].pageNumber} · {compactText(props.policyEvidence[0].fileName, 28)}</div>
                <div className="text-[12px] font-semibold leading-5 text-[#46423E]">{compactText(props.policyEvidence[0].quote, 110)}</div>
              </a>
            ) : !relevantClause ? (
              <div className="rounded-md border border-dashed border-[#CDA963] bg-white/75 px-3 py-3 text-[12px] font-medium text-[#6E6E73]">No quote surfaced yet.</div>
            ) : (
              <button className="w-full rounded-md border border-[#B9D7E8] bg-[#F0F8FC] p-2 text-left" onClick={() => props.setActiveClauseId(relevantClause.id)}>
                <div className="mb-1 text-[11px] font-semibold text-sci">{relevantClause.code}</div>
                <div className="text-[12px] font-semibold leading-5 text-[#46423E]">{compactText(relevantClause.highlight, 68)}</div>
              </button>
            )}
            <button
              className="mt-3 w-full rounded-lg bg-ink px-3 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(0,0,0,.14)] hover:bg-black"
              onClick={() => setShowSessionPlan((current) => !current)}
            >
              {showSessionPlan ? "Hide decision menu" : "View decision menu"}
            </button>
          </div>
          {showSessionPlan && (
            <div className="rounded-lg border border-[#E5E5EA] bg-white/58 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[12px] font-semibold text-sci">
                  <Users size={15} /> Decision menu
                </div>
                <span className="rounded-md bg-white/58 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6E6E73]">
                  Read-only
                </span>
              </div>
              {selectedDecisionOptions.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#CFE7FF] bg-white/58 px-3 py-4 text-center text-[12px] font-medium leading-5 text-[#6E6E73]">
                  Advisor-selected paths appear here.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDecisionOptions.map((option) => (
                    <div key={option.id} className="rounded-lg border border-[#E5E5EA] bg-white/72 px-3 py-2" title={option.clientSummary}>
                      <div className="mb-1 text-[12px] font-semibold text-sci">{option.title}</div>
                      <div className="mb-2 text-[12px] font-semibold leading-5 text-[#46423E]">{compactText(option.clientSummary, 78)}</div>
                      <div className="flex flex-wrap gap-1">
                        {option.effects.slice(0, 2).map((effect) => (
                          <div key={effect} className="rounded-full bg-[#F1F8F3] px-2 py-1 text-[10px] font-bold leading-4 text-[#1E6B43]" title={effect}>
                            {compactText(effect, 28)}
                          </div>
                        ))}
                        {option.limitations.slice(0, 1).map((limitation) => (
                          <div key={limitation} className="rounded-full bg-[#FFF6E8] px-2 py-1 text-[10px] font-bold leading-4 text-[#9A6B00]" title={limitation}>
                            {compactText(limitation, 28)}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-lg bg-white/70 px-3 py-2 text-[11px] font-semibold leading-4 text-[#6C7680]">Neutral explanation only.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </>
  );

  return (
    <>
    <div className="flex min-h-0 flex-1">
      <section className="flex min-w-0 flex-1 bg-paper">
        {useSideTools && (
          <div ref={sideToolsShellRef} className="relative shrink-0" style={{ width: sideToolsWidth }}>
            <aside className="apple-rail h-full w-full overflow-y-auto border-r px-4 py-4 pr-5">
              <div className="space-y-3">{sessionTools}</div>
            </aside>
            <div
              role="separator"
              tabIndex={0}
              aria-label="Resize client tools sidebar"
              aria-orientation="vertical"
              aria-valuemin={SIDE_TOOLS_MIN_WIDTH}
              aria-valuemax={sideToolsMaxWidth()}
              aria-valuenow={sideToolsWidth}
              className={`absolute right-[-6px] top-0 z-20 flex h-full w-3 cursor-col-resize items-center justify-center outline-none transition ${
                isResizingSideTools ? "bg-[#D6EBFF]/65" : "hover:bg-[#D6EBFF]/45 focus-visible:bg-[#D6EBFF]/65"
              }`}
              onPointerDown={(event) => {
                event.preventDefault();
                setIsResizingSideTools(true);
              }}
              onDoubleClick={() => persistSideToolsWidth(SIDE_TOOLS_DEFAULT_WIDTH)}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  persistSideToolsWidth(sideToolsWidth - 24);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  persistSideToolsWidth(sideToolsWidth + 24);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  persistSideToolsWidth(SIDE_TOOLS_MIN_WIDTH);
                }
                if (event.key === "End") {
                  event.preventDefault();
                  persistSideToolsWidth(sideToolsMaxWidth());
                }
              }}
              title="Drag to resize notes sidebar. Double-click to reset."
            >
              <span className="h-14 w-1 rounded-full bg-[#B9C7D1]" />
            </div>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mx-auto max-w-[960px]">
              {!useSideTools && <div className="mb-5 space-y-3">{sessionTools}</div>}
            {props.messages.map((message) => (
              <div key={message.id} className={`mb-5 flex items-start ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <ClariFiAiMark className="mr-3 mt-1" />
                )}
                <div className={`flex max-w-[600px] flex-col gap-2 ${message.role === "user" ? "items-end" : ""}`}>
                  <div className={message.role === "assistant" ? "bot-bubble" : "user-bubble"}>{message.text}</div>
                  {message.detected && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#F1D49B] bg-[#FFF6E8] px-3 py-2 text-xs font-semibold leading-5 text-[#9A6B00]">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      Possible misunderstanding by client - {message.misunderstanding}
                    </div>
                  )}
                  {(message.evidenceIds || []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#A39C95]">Relevant quote</span>
                      {(message.evidenceIds || []).map((id) => {
                        const clause = clauses.find((item) => item.id === id);
                        return clause ? (
                          <button key={id} className="evidence-chip" onClick={() => props.setActiveClauseId(id)}>
                            <FileText size={12} /> {clause.code}
                          </button>
                        ) : null;
                      })}
                    </div>
                  )}
                  {message.teachBack && (
                    <div className="flex items-start gap-2 rounded-lg border border-[#C9E4D3] bg-[#F1F8F3] px-3 py-2 text-sm font-medium leading-6 text-[#1E6B43]">
                      <ShieldCheck size={16} className="mt-1 shrink-0" />
                      <span>
                        <b>Quick check:</b> {message.teachBack}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {props.loading && (
              <div className="mb-5 flex items-center">
                <ClariFiAiMark className="mr-3" />
                <LoadingDots />
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 bg-paper px-6 pb-5 pt-3">
          <div className="mx-auto max-w-[960px]">
            {props.messages.length <= 2 && !props.loading && (
              <div className="mb-3 flex flex-wrap gap-2">
                {[
                  "Summarise advisor",
                  "Covered vs not",
                  "Explain quote",
                  "Ask advisor?"
                ].map((suggestion) => (
                  <button key={suggestion} className="suggestion" onClick={() => send(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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
                placeholder="Ask a follow-up during a pause..."
                className="max-h-[120px] flex-1 resize-none border-none bg-transparent py-2 text-[14.5px] leading-6 outline-none"
              />
              <button className="send-button bg-sci hover:bg-[#073B5B]" onClick={() => send()} aria-label="Send message">
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
        </div>
      </section>
    </div>
    {showExpandedNotes && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,.30)] p-4 backdrop-blur-md"
        onClick={() => setShowExpandedNotes(false)}
      >
        <div
          className="apple-panel flex h-[min(820px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-white/72 px-5 py-4 backdrop-blur-2xl">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-[#248A3D]">
                <NotebookPen size={19} /> My notes
              </div>
              <div className="mt-0.5 text-xs font-medium text-[#6E6E73]">Large writing space saved to AI context.</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg border border-[#CDEDD6] bg-white/70 px-3 py-2 text-xs font-semibold text-[#248A3D] hover:border-[#248A3D]"
                onClick={undoHandwriting}
                type="button"
              >
                Undo
              </button>
              <button
                className="rounded-lg border border-[#FFD1D1] bg-white/70 px-3 py-2 text-xs font-semibold text-[#D70015] hover:border-[#D70015]"
                onClick={clearHandwriting}
                type="button"
              >
                Clear
              </button>
              <button
                className="flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-xs font-semibold text-white hover:bg-black"
                onClick={() => setShowExpandedNotes(false)}
                type="button"
              >
                <Minimize2 size={14} /> Done
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-[#FBFBFD] p-5">
            <canvas
              ref={expandedCanvasRef}
              className="h-full min-h-[420px] w-full touch-none rounded-lg border border-[#D2D2D7] bg-white shadow-[inset_0_0_0_1px_rgba(0,0,0,.025)]"
              style={{
                backgroundImage: "linear-gradient(to bottom, transparent 30px, rgba(30, 142, 90, 0.12) 31px)",
                backgroundSize: "100% 32px"
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              aria-label="Expanded handwritten client notes canvas"
            />
          </div>
          <div className="shrink-0 border-t border-line bg-white/72 p-5 backdrop-blur-xl">
            <textarea
              value={props.clientNotes}
              onChange={(event) => props.onClientNotesChange(event.target.value)}
              rows={3}
              placeholder="Optional typed notes or handwriting clarification..."
              className="w-full resize-none rounded-lg border border-[#D2D2D7] bg-white/72 px-3 py-2 text-[13px] font-medium leading-5 text-[#3A3A3C] outline-none backdrop-blur-xl transition placeholder:text-[#8E8E93] focus:border-[#248A3D] focus:bg-white focus:ring-4 focus:ring-[#DDF6E6]"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
