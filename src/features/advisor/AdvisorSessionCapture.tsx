import {
  Languages,
  Maximize2,
  Mic,
  MicOff,
  NotebookPen,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { PointerEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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

type Props = {
  clientNotes: string;
  onClientNotesChange: (notes: string) => void;
  sessionTranscript: string;
  onSessionTranscriptChange: (transcript: string) => void;
  handwrittenNoteImage: string;
  onHandwrittenNoteImageChange: (image: string) => void;
};

const languages = [
  ["English", "en-SG"],
  ["Chinese", "zh-SG"],
  ["Malay", "ms-SG"],
  ["Tamil", "ta-SG"],
];

export function AdvisorSessionCapture(props: Props) {
  const [mode, setMode] = useState<"transcript" | "notes">("transcript");
  const [language, setLanguage] = useState("en-SG");
  const [listening, setListening] = useState(false);
  const [notice, setNotice] = useState("");
  const [expanded, setExpanded] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const transcriptRef = useRef(props.sessionTranscript);

  useEffect(() => {
    transcriptRef.current = props.sessionTranscript;
  }, [props.sessionTranscript]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("Speech input is not supported in this browser.");
      return;
    }
    const recognition: SpeechRecognitionLike = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event: any) => {
      let finalText = "";
      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        if (event.results[index].isFinal)
          finalText += `${event.results[index][0].transcript} `;
      }
      if (!finalText.trim()) return;
      const next = `${transcriptRef.current}${transcriptRef.current.trim() ? "\n" : ""}${finalText.trim()}`;
      transcriptRef.current = next;
      props.onSessionTranscriptChange(next);
    };
    recognition.onerror = () =>
      setNotice("Speech input stopped. You can continue by typing.");
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setNotice("");
    setListening(true);
  };

  return (
    <div className="apple-panel-quiet overflow-hidden">
      <div className="flex border-b border-[#DCE4EA] p-1">
        <ModeButton
          active={mode === "transcript"}
          onClick={() => setMode("transcript")}
          icon={<Mic size={14} />}
          label="Transcript"
        />
        <ModeButton
          active={mode === "notes"}
          onClick={() => setMode("notes")}
          icon={<NotebookPen size={14} />}
          label="Notes"
        />
      </div>

      {mode === "transcript" ? (
        <div className="p-3">
          <div className="mb-2 flex items-center gap-2">
            <Languages size={14} className="text-[#6E6E73]" />
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-xs font-semibold outline-none"
            >
              {languages.map(([label, value]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              onClick={toggleListening}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-white ${listening ? "bg-[#C8102E]" : "bg-sci"}`}
              aria-label={listening ? "Stop listening" : "Start listening"}
              title={listening ? "Stop listening" : "Start listening"}
            >
              {listening ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
          </div>
          <textarea
            value={props.sessionTranscript}
            onChange={(event) =>
              props.onSessionTranscriptChange(event.target.value)
            }
            rows={8}
            placeholder="Live conversation appears here..."
            className="w-full resize-none rounded-lg border border-[#D2D2D7] bg-white/85 p-3 text-xs leading-5 outline-none focus:border-sci focus:ring-4 focus:ring-[#D6EBFF]"
          />
          <p className="mt-1.5 text-[10.5px] font-medium text-[#6E6E73]">
            {listening
              ? "Listening to the shared conversation..."
              : notice || "Speech and corrections are saved to this session."}
          </p>
        </div>
      ) : (
        <div className="p-3">
          <NoteCanvas
            image={props.handwrittenNoteImage}
            onImage={props.onHandwrittenNoteImageChange}
            expanded={expanded}
            setExpanded={setExpanded}
          />
          <textarea
            value={props.clientNotes}
            onChange={(event) => props.onClientNotesChange(event.target.value)}
            rows={4}
            placeholder="Add concise client observations..."
            className="mt-2 w-full resize-none rounded-lg border border-[#D2D2D7] bg-white/85 p-3 text-xs leading-5 outline-none focus:border-sci focus:ring-4 focus:ring-[#D6EBFF]"
          />
        </div>
      )}
    </div>
  );
}

function ModeButton({
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-semibold ${active ? "bg-white text-sci shadow-sm" : "text-[#6E6E73]"}`}
    >
      {icon}
      {label}
    </button>
  );
}

function NoteCanvas({
  image,
  onImage,
  expanded,
  setExpanded,
}: {
  image: string;
  onImage: (image: string) => void;
  expanded: boolean;
  setExpanded: (value: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const history = useRef<string[]>([]);

  const paint = (source = image) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(rect.width, 280);
    const height = Math.max(rect.height, expanded ? 500 : 170);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
    context.strokeStyle = "rgba(0,122,255,.10)";
    context.lineWidth = 1;
    for (let y = 34; y < height; y += 34) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    if (source) {
      const note = new Image();
      note.onload = () => context.drawImage(note, 0, 0, width, height);
      note.src = source;
    }
  };

  useEffect(() => {
    const frame = requestAnimationFrame(() => paint());
    return () => cancelAnimationFrame(frame);
  }, [image, expanded]);

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const start = (event: PointerEvent<HTMLCanvasElement>) => {
    history.current.push(image);
    if (history.current.length > 12) history.current.shift();
    drawing.current = true;
    last.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || !last.current) return;
    const next = point(event);
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    context.strokeStyle = "#1D1D1F";
    context.lineWidth = 2.5;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(last.current.x, last.current.y);
    context.lineTo(next.x, next.y);
    context.stroke();
    last.current = next;
  };
  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (canvasRef.current) onImage(canvasRef.current.toDataURL("image/png"));
  };
  const undo = () => onImage(history.current.pop() || "");

  const content = (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className={`w-full touch-none rounded-lg border border-[#D2D2D7] bg-white ${expanded ? "h-[min(62vh,620px)]" : "h-[170px]"}`}
      />
      <div className="absolute bottom-2 right-2 flex gap-1">
        <button
          onClick={undo}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-white/95 text-[#3A3A3C]"
          title="Undo"
          aria-label="Undo"
        >
          <RotateCcw size={14} />
        </button>
        <button
          onClick={() => onImage("")}
          className="flex h-8 w-8 items-center justify-center rounded-md border bg-white/95 text-[#C8102E]"
          title="Clear"
          aria-label="Clear"
        >
          <Trash2 size={14} />
        </button>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-sci text-white"
          title={expanded ? "Close expanded notes" : "Expand notes"}
          aria-label={expanded ? "Close expanded notes" : "Expand notes"}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );

  return expanded ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-8 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Session notes</h2>
            <p className="text-xs text-[#6E6E73]">
              Write with an iPad pencil or pointer.
            </p>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="rounded-lg border px-3 py-2 text-xs font-semibold"
          >
            Done
          </button>
        </div>
        {content}
      </div>
    </div>
  ) : (
    content
  );
}
