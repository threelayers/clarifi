import {
  AlertTriangle,
  Check,
  Circle,
  Clock3,
  HelpCircle,
  Languages,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  NotebookPen,
  Quote,
  Send,
  Users
} from "lucide-react";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { clauses, profile } from "@/domain/policy";
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
  covered: { label: "Understood well" },
  action: { label: "Needs clarification" },
  not_covered: { label: "Not covered yet" }
};

const speechLanguages = [
  { label: "English", value: "en-SG" },
  { label: "Chinese", value: "zh-SG" },
  { label: "Malay", value: "ms-SG" },
  { label: "Tamil", value: "ta-SG" }
];

const SIDE_TOOLS_WIDTH_KEY = "clarifi.clientSideToolsWidth";
const SIDE_TOOLS_MIN_WIDTH = 360;
const SIDE_TOOLS_DEFAULT_WIDTH = 408;
const SIDE_TOOLS_MAX_WIDTH = 520;

const parseTranscript = (transcript: string) =>
  transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const timed = line.match(/^\[(\d{1,2}:\d{2})\]\s*\[(Client|Advisor)\]\s*(.*)$/i);
      const neutralTimed = line.match(/^\[(\d{1,2}:\d{2})\]\s*(.*)$/i);
      const labelled = line.match(/^\[(Client|Advisor)\]\s*(.*)$/i);
      if (timed) return { id: `${index}-${line}`, time: timed[1], text: timed[3] };
      if (neutralTimed) return { id: `${index}-${line}`, time: neutralTimed[1], text: neutralTimed[2] };
      if (labelled) return { id: `${index}-${line}`, time: "Recorded", text: labelled[2] };
      return { id: `${index}-${line}`, time: "Recorded", text: line };
    });

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
    typeof window !== "undefined" ? window.matchMedia("(min-width: 960px)").matches : false
  );
  const [sideToolsWidth, setSideToolsWidth] = useState(savedSideToolsWidth);
  const [isResizingSideTools, setIsResizingSideTools] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sideToolsShellRef = useRef<HTMLDivElement>(null);
  const questionInputRef = useRef<HTMLTextAreaElement>(null);
  const explanationRef = useRef<HTMLElement>(null);
  const awaitingExplanationRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const expandedCanvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(props.sessionTranscript);
  const sideToolsWidthRef = useRef(sideToolsWidth);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const canvasHistoryRef = useRef<string[]>([]);

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
    const media = window.matchMedia("(min-width: 960px)");
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
  const focusItems = useMemo(
    () => props.preMeetingPrep.clientWidget.bullets.slice(0, 3),
    [props.preMeetingPrep.clientWidget.bullets]
  );
  const transcriptRows = useMemo(() => parseTranscript(props.sessionTranscript).slice(-5), [props.sessionTranscript]);
  const latestUserMessage = useMemo(
    () => [...props.messages].reverse().find((message) => message.role === "user"),
    [props.messages]
  );
  const latestExplanation = useMemo(
    () => [...props.messages].reverse().find((message) => message.role === "assistant" && message.id !== props.messages[0]?.id),
    [props.messages]
  );
  const trackedTopics = useMemo<Understanding[]>(() => {
    if (record.length > 0) return record.slice(0, 5);
    return focusItems.map((point) => ({ point, status: "action" as const }));
  }, [focusItems, record]);
  const clarificationItems = useMemo(() => {
    const items = record.filter((item) => item.status !== "covered");
    if (items.length > 0) return items.slice(0, 3);
    if (record.length > 0) return [];
    return focusItems.slice(0, 2).map((point) => ({ point, status: "action" as const }));
  }, [focusItems, record]);

  useEffect(() => {
    if (props.loading || !awaitingExplanationRef.current || !latestExplanation) return;
    awaitingExplanationRef.current = false;
    const frame = window.requestAnimationFrame(() => {
      explanationRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => explanationRef.current?.focus({ preventScroll: true }), 450);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [latestExplanation, props.loading]);

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
        context.strokeStyle = "rgba(22, 119, 168, 0.14)";
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
    const time = new Date().toLocaleTimeString("en-SG", { hour: "2-digit", minute: "2-digit", hour12: false });
    const line = `[${time}] ${trimmed}`;
    const current = transcriptRef.current.trim();
    const nextTranscript = current ? `${current}\n${line}` : line;
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
    awaitingExplanationRef.current = true;
    props.onSend(trimmed);
    setInput("");
  };

  const prepareAdvisorQuestion = (topic: string) => {
    setInput(`What should I ask my advisor about ${topic.toLowerCase()}?`);
    window.requestAnimationFrame(() => questionInputRef.current?.focus());
  };

  const sessionTools = (
    <div className="divide-y divide-[#D7DDE5]">
      <section className="pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#0B3A5B] text-xs font-bold text-white">TL</div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-[#17212B]">{profile.name}</div>
            <div className="mt-0.5 text-xs text-[#66717D]">28 · Freelance</div>
            <div className="mt-0.5 truncate text-xs font-medium text-[#34485A]">PRUShield Plus</div>
          </div>
        </div>
      </section>

      <section className="py-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#17212B]">Live conversation</h2>
            <p className="mt-0.5 text-[11px] text-[#77818B]">Consultation transcript</p>
          </div>
          <button
            className={`flex h-8 w-8 items-center justify-center rounded-md border transition ${
              isListening
                ? "border-[#B4233A] bg-[#B4233A] text-white"
                : "border-[#B7C5D1] bg-white text-[#075C91] hover:border-[#075C91]"
            }`}
            onClick={isListening ? stopListening : startListening}
            aria-label={isListening ? "Stop listening" : "Start listening"}
            title={isListening ? "Stop transcription" : "Start transcription"}
          >
            {isListening ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
        </div>

        <div className="mb-3 flex justify-end">
          <label className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-[#4D5965]">
            <Languages size={13} />
            <select
              value={speechLang}
              onChange={(event) => setSpeechLang(event.target.value)}
              className="min-w-0 border-0 bg-transparent font-semibold outline-none"
              aria-label="Transcription language"
            >
              {speechLanguages.map((language) => (
                <option key={language.value} value={language.value}>{language.label}</option>
              ))}
            </select>
          </label>
        </div>

        {transcriptRows.length > 0 && (
          <div className="mb-3 max-h-40 space-y-3 overflow-y-auto border-l-2 border-[#B9C7D4] pl-3">
            {transcriptRows.map((row) => (
              <div key={row.id}>
                <div className="flex items-center gap-2 text-[10px] text-[#7A858F]">
                  <span>{row.time}</span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[#35424E]">{row.text}</p>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={props.sessionTranscript}
          onChange={(event) => props.onSessionTranscriptChange(event.target.value)}
          rows={3}
          placeholder="Add or correct the consultation transcript..."
          className="w-full resize-none rounded-md border border-[#C9D1DA] bg-white px-3 py-2 text-xs leading-5 text-[#34404B] outline-none transition placeholder:text-[#8A949E] focus:border-[#1677A8] focus:ring-2 focus:ring-[#DCEEF7]"
        />
        {(interimText || speechNotice) && (
          <p className={`mt-2 text-[11px] leading-4 ${speechNotice ? "text-[#9A6700]" : "text-[#52616D]"}`}>
            {interimText || speechNotice}
          </p>
        )}
      </section>

      <section className="pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[#17212B]"><NotebookPen size={16} /> My notes</h2>
            <p className="mt-1 max-w-[290px] text-[11px] leading-4 text-[#68737E]">Private to you · Used only to improve clarity during this session</p>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#39704D]"><Check size={12} /> Saved</span>
        </div>

        <div className="mb-3 flex items-center justify-end gap-3 text-[11px] font-medium">
          <button className="text-[#66717D] hover:text-[#075C91]" onClick={undoHandwriting} type="button">Undo</button>
          <button className="text-[#8C3C46] hover:text-[#B4233A]" onClick={clearHandwriting} type="button">Clear</button>
        </div>
        <div className="relative">
          <canvas
            ref={canvasRef}
            className={`${useSideTools ? "h-[168px]" : "h-[128px]"} w-full touch-none rounded-md border border-[#C9D1DA] bg-white`}
            style={{ backgroundImage: "linear-gradient(to bottom, transparent 31px, rgba(22,119,168,.12) 32px)", backgroundSize: "100% 32px" }}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            aria-label="Handwritten client notes canvas"
          />
          <button
            type="button"
            className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md border border-[#B7C5D1] bg-white px-2 py-1 text-[10.5px] font-semibold text-[#075C91] hover:border-[#075C91]"
            onClick={() => setShowExpandedNotes(true)}
            aria-label="Expand handwriting notes"
          >
            <Maximize2 size={12} /> Expand
          </button>
        </div>
        <textarea
          value={props.clientNotes}
          onChange={(event) => props.onClientNotesChange(event.target.value)}
          rows={3}
          placeholder="Type your own notes here..."
          className="mt-3 w-full resize-none rounded-md border border-[#C9D1DA] bg-white px-3 py-2 text-xs leading-5 text-[#34404B] outline-none transition placeholder:text-[#8A949E] focus:border-[#1677A8] focus:ring-2 focus:ring-[#DCEEF7]"
        />
      </section>
    </div>
  );

  return (
    <>
    <div className="flex min-h-0 flex-1 bg-[#F5F7F9]">
      {useSideTools && (
        <div ref={sideToolsShellRef} className="relative shrink-0" style={{ width: sideToolsWidth }}>
          <aside className="h-full w-full overflow-y-auto border-r border-[#C8D0D8] bg-[#EDF1F4] px-5 py-5 pr-6" aria-label="Consultation tools">
            {sessionTools}
          </aside>
          <div
            role="separator"
            tabIndex={0}
            aria-label="Resize client tools sidebar"
            aria-orientation="vertical"
            aria-valuemin={SIDE_TOOLS_MIN_WIDTH}
            aria-valuemax={sideToolsMaxWidth()}
            aria-valuenow={sideToolsWidth}
            className={`absolute right-[-5px] top-0 z-20 flex h-full w-2 cursor-col-resize items-center justify-center outline-none ${isResizingSideTools ? "bg-[#D7E8F2]" : "hover:bg-[#E0EBF2] focus-visible:bg-[#D7E8F2]"}`}
            onPointerDown={(event) => { event.preventDefault(); setIsResizingSideTools(true); }}
            onDoubleClick={() => persistSideToolsWidth(SIDE_TOOLS_DEFAULT_WIDTH)}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft") { event.preventDefault(); persistSideToolsWidth(sideToolsWidth - 24); }
              if (event.key === "ArrowRight") { event.preventDefault(); persistSideToolsWidth(sideToolsWidth + 24); }
              if (event.key === "Home") { event.preventDefault(); persistSideToolsWidth(SIDE_TOOLS_MIN_WIDTH); }
              if (event.key === "End") { event.preventDefault(); persistSideToolsWidth(sideToolsMaxWidth()); }
            }}
            title="Drag to resize the consultation tools"
          >
            <span className="h-12 w-0.5 bg-[#AAB6C0]" />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col bg-[#FAFBFC]">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1080px] px-6 py-7 lg:px-10 lg:py-9">
            {!useSideTools && <div className="mb-8 border-b border-[#D8DEE5] bg-[#EDF1F4] p-5">{sessionTools}</div>}

            <header className="mb-8 border-b border-[#D8DEE5] pb-6">
              <p className="mb-2 text-xs font-semibold text-[#075C91]">Current consultation</p>
              <h1 className="text-[28px] font-semibold leading-tight text-[#142230]">Your consultation</h1>
              <p className="mt-3 max-w-[780px] text-sm leading-6 text-[#5D6974]">
                ClariFi helps you keep track of what has been discussed and identify anything that may need clarification. Your advisor remains responsible for financial advice.
              </p>
            </header>

            <div className="grid gap-8 xl:grid-cols-2">
              <section aria-labelledby="covered-heading">
                <div className="mb-3 flex items-end justify-between border-b border-[#D8DEE5] pb-3">
                  <div>
                    <h2 id="covered-heading" className="text-base font-semibold text-[#17212B]">What we&apos;ve covered</h2>
                    <p className="mt-1 text-xs text-[#74808B]">Learning points from this consultation</p>
                  </div>
                  <span className="text-xs font-medium text-[#5B6670]">{clarityCounts.clear} clear</span>
                </div>
                <div className="divide-y divide-[#E0E5EA]">
                  {trackedTopics.map((item) => (
                    <div key={item.point} className="flex items-start gap-3 py-3">
                      {item.status === "covered" ? (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#237A4B] text-white"><Check size={12} /></span>
                      ) : (
                        <Circle size={20} className={`mt-0.5 shrink-0 ${item.status === "action" ? "text-[#C48318]" : "text-[#AEB7C0]"}`} />
                      )}
                      <div>
                        <p className="text-sm font-medium leading-5 text-[#293640]">{item.point}</p>
                        <p className="mt-1 text-[11px] text-[#7A858F]">{statusMeta[item.status].label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="clarify-heading">
                <div className="mb-3 border-b border-[#D8DEE5] pb-3">
                  <h2 id="clarify-heading" className="text-base font-semibold text-[#17212B]">Things to clarify</h2>
                  <p className="mt-1 text-xs text-[#74808B]">Points that may benefit from further explanation</p>
                </div>
                <div className="divide-y divide-[#E0E5EA]">
                  {clarificationItems.length === 0 ? (
                    <p className="py-4 text-sm text-[#74808B]">No clarification points have been identified.</p>
                  ) : clarificationItems.map((item) => (
                    <div key={item.point} className="py-3">
                      <div className="flex items-start gap-3">
                        <HelpCircle size={19} className="mt-0.5 shrink-0 text-[#C48318]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-5 text-[#293640]">{item.point}</p>
                          <p className="mt-1 text-xs leading-5 text-[#697580]">Confirm how this applies to your circumstances and policy.</p>
                          <button className="mt-2 text-xs font-semibold text-[#075C91] hover:underline" onClick={() => prepareAdvisorQuestion(item.point)}>
                            Ask advisor
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section
              ref={explanationRef}
              className="mt-9 scroll-mt-6 outline-none"
              aria-labelledby="explanation-heading"
              aria-live="polite"
              tabIndex={-1}
            >
              <div className="mb-4 border-b border-[#D8DEE5] pb-3">
                <h2 id="explanation-heading" className="text-base font-semibold text-[#17212B]">Key explanation</h2>
                <p className="mt-1 text-xs text-[#74808B]">The latest question, explanation and supporting wording</p>
              </div>

              {latestUserMessage && latestExplanation ? (
                <div className="rounded-lg border border-[#CDD5DD] bg-white">
                  <div className="border-b border-[#E0E5EA] px-5 py-4">
                    <div className="mb-1 text-[11px] font-semibold text-[#697580]">Your question</div>
                    <h3 className="text-base font-semibold leading-6 text-[#17212B]">{latestUserMessage.text}</h3>
                  </div>
                  <div className="px-5 py-5">
                    <div className="mb-2 text-[11px] font-semibold text-[#075C91]">General explanation</div>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-[#35424E]">{latestExplanation.text}</p>

                    {latestExplanation.detected && (
                      <div className="mt-5 flex items-start gap-3 border-l-4 border-[#C48318] bg-[#FFF8E8] px-4 py-3 text-sm leading-5 text-[#74551D]">
                        <AlertTriangle size={17} className="mt-0.5 shrink-0" />
                        <span><strong>Something to clarify:</strong> {latestExplanation.misunderstanding}</span>
                      </div>
                    )}

                    <div className="mt-6 border-t border-[#E0E5EA] pt-5">
                      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold text-[#5E6974]"><Quote size={14} /> From your policy</div>
                      {props.policyEvidence.length > 0 ? (
                        <a
                          className="block border-l-2 border-[#1677A8] bg-[#F3F7F9] px-4 py-3 text-sm leading-6 text-[#344552] hover:bg-[#EEF4F7]"
                          href={`/api/policies/${props.sessionId}/documents/${props.policyEvidence[0].documentId}/download`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <span className="mb-1 block text-xs font-semibold text-[#075C91]">Page {props.policyEvidence[0].pageNumber} · {props.policyEvidence[0].fileName}</span>
                          “{props.policyEvidence[0].quote}”
                        </a>
                      ) : relevantClause ? (
                        <button className="block w-full border-l-2 border-[#1677A8] bg-[#F3F7F9] px-4 py-3 text-left text-sm leading-6 text-[#344552] hover:bg-[#EEF4F7]" onClick={() => props.setActiveClauseId(relevantClause.id)}>
                          <span className="mb-1 block text-xs font-semibold text-[#075C91]">{relevantClause.code} · {relevantClause.title}</span>
                          “{relevantClause.highlight}”
                        </button>
                      ) : (
                        <p className="border-l-2 border-[#C7D0D8] bg-[#F5F7F8] px-4 py-3 text-sm text-[#77818B]">A relevant policy quotation will appear after one is identified.</p>
                      )}
                    </div>

                    <div className="mt-5 border-t border-[#E0E5EA] pt-4">
                      <div className="mb-1 text-[11px] font-semibold text-[#5E6974]">Advisor guidance</div>
                      <p className="text-sm leading-6 text-[#4B5863]">{latestExplanation.teachBack || "Your advisor can confirm how this explanation applies to your personal circumstances and policy."}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-l-2 border-[#9BB7C8] bg-[#F3F6F8] px-5 py-5">
                  <p className="text-sm font-medium text-[#344552]">No question has been asked yet.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6D7882]">Ask about anything discussed during the consultation and the explanation will appear here with relevant policy wording.</p>
                </div>
              )}
              {props.loading && <p className="mt-3 flex items-center gap-2 text-xs font-medium text-[#075C91]"><Clock3 size={14} /> Preparing a clear explanation...</p>}
            </section>

            <section className="mt-9 border-t border-[#D8DEE5] pt-6" aria-labelledby="plan-heading">
              <button className="flex w-full items-center justify-between gap-4 text-left" onClick={() => setShowSessionPlan((current) => !current)} aria-expanded={showSessionPlan}>
                <span>
                  <span id="plan-heading" className="flex items-center gap-2 text-base font-semibold text-[#17212B]"><Users size={17} /> Advisor&apos;s discussion plan</span>
                  <span className="mt-1 block text-xs text-[#74808B]">Read-only view of the paths selected for this consultation</span>
                </span>
                <span className="text-xs font-semibold text-[#075C91]">{showSessionPlan ? "Hide" : "View"}</span>
              </button>
              {showSessionPlan && (
                <div className="mt-4 divide-y divide-[#E0E5EA] border-y border-[#D8DEE5]">
                  {selectedDecisionOptions.length === 0 ? (
                    <p className="py-4 text-sm text-[#74808B]">Your advisor has not selected a discussion path yet.</p>
                  ) : selectedDecisionOptions.map((option) => (
                    <div key={option.id} className="py-4">
                      <div className="text-sm font-semibold text-[#25333E]">{option.title}</div>
                      <p className="mt-1 text-sm leading-6 text-[#5D6974]">{option.clientSummary}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>

        <footer className="shrink-0 border-t border-[#CDD5DD] bg-white px-6 py-4 lg:px-10">
          <div className="mx-auto max-w-[1080px]">
            <label htmlFor="client-question" className="mb-2 block text-xs font-semibold text-[#344552]">Something unclear? Ask a question</label>
            <div className="flex items-end gap-2">
              <textarea
                id="client-question"
                ref={questionInputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }}
                rows={1}
                placeholder="Type your question..."
                className="max-h-[96px] min-h-10 flex-1 resize-none rounded-md border border-[#BFC8D1] bg-white px-3 py-2.5 text-sm leading-5 text-[#26333D] outline-none placeholder:text-[#8A949E] focus:border-[#1677A8] focus:ring-2 focus:ring-[#DCEEF7]"
              />
              <button className="flex h-10 items-center gap-2 rounded-md bg-[#075C91] px-4 text-sm font-semibold text-white hover:bg-[#064B76]" onClick={() => send()}>
                Ask <Send size={14} />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {["What’s covered?", "Explain this term", "What should I ask my advisor?"].map((suggestion) => (
                <button key={suggestion} className="text-[#5D6974] hover:text-[#075C91] hover:underline" onClick={() => setInput(suggestion)}>{suggestion}</button>
              ))}
            </div>
          </div>
        </footer>
      </main>
    </div>
    {showExpandedNotes && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,27,40,.42)] p-4"
        onClick={() => setShowExpandedNotes(false)}
      >
        <div
          className="flex h-[min(820px,calc(100vh-32px))] w-[min(1120px,calc(100vw-32px))] flex-col overflow-hidden rounded-lg border border-[#BFC8D1] bg-white"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#D5DCE3] bg-[#F4F6F8] px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-[#17212B]">
                <NotebookPen size={19} /> My notes
              </div>
              <div className="mt-1 text-xs text-[#68737E]">Private to you · Used only to improve clarity during this session</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md px-2 py-2 text-xs font-semibold text-[#5E6974] hover:bg-[#E7EBEF]"
                onClick={undoHandwriting}
                type="button"
              >
                Undo
              </button>
              <button
                className="rounded-md px-2 py-2 text-xs font-semibold text-[#9A3A46] hover:bg-[#F8E8EA]"
                onClick={clearHandwriting}
                type="button"
              >
                Clear
              </button>
              <button
                className="flex items-center gap-2 rounded-md bg-[#0B3A5B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#082E48]"
                onClick={() => setShowExpandedNotes(false)}
                type="button"
              >
                <Minimize2 size={14} /> Done
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 bg-[#EDF1F4] p-5">
            <canvas
              ref={expandedCanvasRef}
              className="h-full min-h-[420px] w-full touch-none rounded-md border border-[#BFC8D1] bg-white"
              style={{
                backgroundImage: "linear-gradient(to bottom, transparent 31px, rgba(22, 119, 168, 0.14) 32px)",
                backgroundSize: "100% 32px"
              }}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerCancel={stopDrawing}
              aria-label="Expanded handwritten client notes canvas"
            />
          </div>
          <div className="shrink-0 border-t border-[#D5DCE3] bg-white p-5">
            <textarea
              value={props.clientNotes}
              onChange={(event) => props.onClientNotesChange(event.target.value)}
              rows={3}
              placeholder="Optional typed notes or handwriting clarification..."
              className="w-full resize-none rounded-md border border-[#BFC8D1] bg-white px-3 py-2 text-[13px] leading-5 text-[#34404B] outline-none transition placeholder:text-[#8A949E] focus:border-[#1677A8] focus:ring-2 focus:ring-[#DCEEF7]"
            />
          </div>
        </div>
      </div>
    )}
    </>
  );
}
