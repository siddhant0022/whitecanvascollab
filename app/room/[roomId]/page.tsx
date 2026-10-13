"use client";

import { useEffect, useRef, useState, memo, type PointerEvent as PE } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { getStroke } from "perfect-freehand";
import { LiveList, LiveObject } from "@liveblocks/client";
import {
  RoomProvider, ClientSideSuspense, useOthers, useMyPresence, useStorage, useMutation, useUndo, useRedo,
  useCanUndo, useCanRedo, initialStorage,
} from "@/liveblocks.config";
import type { Shape, Stroke } from "@/types";

const COLORS = ["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#f9fafb"];
const NOTE_COLORS = ["#fef08a", "#fbcfe8", "#bae6fd", "#bbf7d0"];
const SIZE = 6;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;
const THEME_STORAGE_KEY = "whitecanvas-theme";
type Tool = "pen" | "eraser" | "pan" | Shape["kind"];

const toWorldPosition = (clientX: number, clientY: number, zoom: number, pan: { x: number; y: number }) => ({
  x: (clientX - window.innerWidth / 2 - pan.x) / zoom + window.innerWidth / 2,
  y: (clientY - window.innerHeight / 2 - pan.y) / zoom + window.innerHeight / 2,
});

const distanceToSegment = (
  point: { x: number; y: number },
  start: { x: number; y: number },
  end: { x: number; y: number },
) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  const projection = lengthSquared === 0
    ? 0
    : Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + projection * dx), point.y - (start.y + projection * dy));
};

const pointInTriangle = (
  point: { x: number; y: number },
  vertices: { x: number; y: number }[],
) => {
  const [a, b, c] = vertices;
  if (!a || !b || !c) return false;
  const sign = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

const arrowHeadVertices = (shape: Shape) => {
  const tip = { x: shape.x + shape.width, y: shape.y + shape.height };
  const angle = Math.atan2(shape.height, shape.width);
  const length = Math.max(12, shape.strokeWidth * 3);
  const wingAngle = Math.PI / 7;
  return [
    tip,
    { x: tip.x - length * Math.cos(angle - wingAngle), y: tip.y - length * Math.sin(angle - wingAngle) },
    { x: tip.x - length * Math.cos(angle + wingAngle), y: tip.y - length * Math.sin(angle + wingAngle) },
  ];
};

const arrowHeadPoints = (shape: Shape) =>
  arrowHeadVertices(shape).map(({ x, y }) => `${x},${y}`).join(" ");

const escapeXml = (value: string) => value.replace(/[<>&"']/g, (character) => ({
  "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;",
}[character] ?? character));

const toPath = (s: Stroke) => {
  const o = getStroke(s.points as number[][], {
    size: s.size, thinning: 0.6, smoothing: 0.5, streamline: 0.5,
    simulatePressure: s.points[0]?.[2] === 0.5,
  });
  if (!o.length) return "";
  const d = o.reduce<(string | number)[]>(
    (a, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      a.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return a;
    },
    ["M", ...o[0], "Q"]
  );
  return [...d, "Z"].join(" ");
};

const Cursor = ({ x, y, color, name }: { x: number; y: number; color: string; name: string }) => (
  <div
    className="pointer-events-none fixed left-0 top-0 z-50 flex items-start transition-transform duration-75"
    style={{ transform: `translate(${x}px,${y}px)` }}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="1.5">
      <path d="M5 3l14 8-6 2-2 6z" />
    </svg>
    <span className="ml-1 mt-3 rounded-full px-2 py-0.5 text-xs font-medium text-white shadow" style={{ background: color }}>
      {name}
    </span>
  </div>
);

const StickyNote = memo(function StickyNote({
  id,
  zoom,
  pan,
}: {
  id: string;
  zoom: number;
  pan: { x: number; y: number };
}) {
  const note = useStorage((r) => r.notes.find((n) => n.id === id));
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const patch = useMutation(({ storage }, p: Partial<{ x: number; y: number; text: string }>) => {
    storage.get("notes").find((n) => n.get("id") === id)?.update(p);
  }, [id]);
  const remove = useMutation(({ storage }) => {
    const l = storage.get("notes");
    const i = l.findIndex((n) => n.get("id") === id);
    if (i >= 0) l.delete(i);
  }, [id]);

  if (!note) return null;
  return (
    <div
      className="fixed z-10 flex h-40 w-44 flex-col rounded-md shadow-lg"
      style={{ left: note.x, top: note.y, background: note.color }}
    >
      <div
        className="flex h-6 cursor-grab touch-none items-center justify-between rounded-t-md bg-black/10 px-1.5 active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          const position = toWorldPosition(e.clientX, e.clientY, zoom, pan);
          drag.current = { dx: position.x - note.x, dy: position.y - note.y };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const position = toWorldPosition(e.clientX, e.clientY, zoom, pan);
          patch({ x: position.x - drag.current.dx, y: position.y - drag.current.dy });
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-black/40">Note</span>
        <button
          className="text-sm leading-none text-black/50 hover:text-black"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => remove()}
          aria-label="Delete note"
        >
          ×
        </button>
      </div>
      <textarea
        className="flex-1 resize-none bg-transparent p-2 text-sm text-gray-900 outline-none"
        value={note.text}
        placeholder="Type…"
        onChange={(e) => patch({ text: e.target.value })}
      />
    </div>
  );
});

function Board({ roomId }: { roomId: string }) {
  const [me, setMe] = useMyPresence();
  const { user, isLoaded, isSignedIn } = useUser();
  const [color, setColor] = useState(COLORS[0]);
  const [tool, setTool] = useState<Tool>("pen");
  const [copied, setCopied] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [shapePreview, setShapePreview] = useState<Shape | null>(null);
  const others = useOthers();
  const strokes = useStorage((r) => r.strokes);
  const shapes = useStorage((r) => r.shapes ?? []);
  const notes = useStorage((r) => r.notes.map((note) => ({
    id: note.id, x: note.x, y: note.y, text: note.text, color: note.color,
  })));
  const noteIds = useStorage((r) => r.notes.map((n) => n.id), (a, b) => a.length === b.length && a.every((v, i) => v === b[i]));
  const undo = useUndo();
  const redo = useRedo();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const draft = useRef<Stroke | null>(null);
  const shapeDraft = useRef<Shape | null>(null);
  const panStart = useRef<{ clientX: number; clientY: number; x: number; y: number } | null>(null);

  useEffect(() => {
    const name = user?.fullName ?? user?.username ?? user?.primaryEmailAddress?.emailAddress.split("@")[0];
    if (isLoaded && isSignedIn && name) setMe({ name });
  }, [isLoaded, isSignedIn, setMe, user]);

  useEffect(() => {
    try {
      const savedDarkMode = window.localStorage.getItem(THEME_STORAGE_KEY) === "dark";
      setDarkMode(savedDarkMode);
      if (savedDarkMode) setColor("#f9fafb");
    } catch (error) {
      console.error("Could not load the saved board theme.", error);
    }
  }, []);

  const toggleTheme = () => {
    const nextDarkMode = !darkMode;
    setDarkMode(nextDarkMode);
    setColor((current) => {
      if (nextDarkMode && current === "#111827") return "#f9fafb";
      if (!nextDarkMode && current === "#f9fafb") return "#111827";
      return current;
    });
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextDarkMode ? "dark" : "light");
    } catch (error) {
      console.error("Could not save the board theme.", error);
      setExportMessage("Theme changed, but the preference could not be saved.");
      window.setTimeout(() => setExportMessage(""), 3500);
    }
  };

  const addStroke = useMutation(({ storage }, s: Stroke) => { storage.get("strokes").push(s); }, []);
  const addShape = useMutation(({ storage }, shape: Shape) => {
    const storedShapes = storage.get("shapes");
    if (storedShapes) storedShapes.push(shape);
    else storage.set("shapes", new LiveList([shape]));
  }, []);
  const eraseAt = useMutation(({ storage }, point: { x: number; y: number }) => {
    const radius = 16;
    const storedStrokes = storage.get("strokes");
    for (let i = storedStrokes.length - 1; i >= 0; i--) {
      const stroke = storedStrokes.get(i);
      if (!stroke) continue;
      const points = stroke.points;
      const hit = points.some(([x, y], index) =>
        index === 0
          ? Math.hypot(point.x - x, point.y - y) <= radius
          : distanceToSegment(point, { x: points[index - 1][0], y: points[index - 1][1] }, { x, y }) <= radius
      );
      if (hit) storedStrokes.delete(i);
    }

    const storedShapes = storage.get("shapes");
    if (storedShapes) {
      for (let i = storedShapes.length - 1; i >= 0; i--) {
        const shape = storedShapes.get(i);
        if (!shape) continue;
        const start = { x: shape.x, y: shape.y };
        const end = { x: shape.x + shape.width, y: shape.y + shape.height };
        const left = Math.min(start.x, end.x);
        const right = Math.max(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const bottom = Math.max(start.y, end.y);
        const rectangleCorners = [
          { x: left, y: top },
          { x: right, y: top },
          { x: right, y: bottom },
          { x: left, y: bottom },
        ];
        const normalizedEllipseDistance = Math.hypot(
              (point.x - (start.x + end.x) / 2) / Math.max(Math.abs(shape.width) / 2, 1),
              (point.y - (start.y + end.y) / 2) / Math.max(Math.abs(shape.height) / 2, 1),
            );
        const arrowHead = shape.kind === "arrow" ? arrowHeadVertices(shape) : null;
        const hit = shape.kind === "rectangle"
          ? (point.x >= left && point.x <= right && point.y >= top && point.y <= bottom) ||
            rectangleCorners.some((corner, index, corners) =>
              distanceToSegment(point, corner, corners[(index + 1) % corners.length]) <= radius
            )
          : shape.kind === "ellipse"
            ? normalizedEllipseDistance <= 1 ||
              Math.abs(normalizedEllipseDistance - 1) * Math.max(Math.abs(shape.width), Math.abs(shape.height)) / 2 <= radius
            : distanceToSegment(point, start, end) <= radius ||
              Boolean(arrowHead && (
                pointInTriangle(point, arrowHead) ||
                arrowHead.some((vertex, index, vertices) =>
                  distanceToSegment(point, vertex, vertices[(index + 1) % vertices.length]) <= radius
                )
              ));
        if (hit) storedShapes.delete(i);
      }
    }

    const storedNotes = storage.get("notes");
    for (let i = storedNotes.length - 1; i >= 0; i--) {
      const note = storedNotes.get(i);
      if (!note) continue;
      const x = note.get("x");
      const y = note.get("y");
      if (point.x >= x - radius && point.x <= x + 176 + radius &&
          point.y >= y - radius && point.y <= y + 160 + radius) {
        storedNotes.delete(i);
      }
    }
  }, []);
  const clear = useMutation(({ storage }) => {
    storage.get("strokes").clear();
    storage.get("shapes")?.clear();
    storage.get("notes").clear();
  }, []);
  const addNote = useMutation(({ storage }) => {
    storage.get("notes").push(new LiveObject({
      id: crypto.randomUUID(),
      x: window.innerWidth / 2 - 88 + Math.random() * 80 - 40,
      y: window.innerHeight / 2 - 80 + Math.random() * 80 - 40,
      text: "",
      color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
    }));
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditing = target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
      if (isEditing) return;

      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      } else if (modifier && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      } else if (!modifier && !event.altKey) {
        const shortcuts: Record<string, Tool> = {
          p: "pen", e: "eraser", h: "pan", r: "rectangle", o: "ellipse", l: "line", a: "arrow",
        };
        const selectedTool = shortcuts[event.key.toLowerCase()];
        if (selectedTool) setTool(selectedTool);
        else if (event.key === "0") {
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
        else if (event.key.toLowerCase() === "n") addNote();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addNote, redo, undo]);

  const exportBoard = async (format: "svg" | "png") => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const strokeMarkup = strokes.map((stroke) => `<path d="${toPath(stroke as Stroke)}" fill="${escapeXml(stroke.color)}"/>`).join("");
    const shapeMarkup = shapes.map((shape) => {
      const stroke = `fill="none" stroke="${escapeXml(shape.color)}" stroke-width="${shape.strokeWidth}"`;
      if (shape.kind === "line" || shape.kind === "arrow") {
        const line = `<line x1="${shape.x}" y1="${shape.y}" x2="${shape.x + shape.width}" y2="${shape.y + shape.height}" ${stroke}/>`;
        if (shape.kind === "arrow") {
          return `${line}<polygon points="${arrowHeadPoints(shape)}" fill="${escapeXml(shape.color)}"/>`;
        }
        return line;
      }
      if (shape.kind === "ellipse") {
        return `<ellipse cx="${shape.x + shape.width / 2}" cy="${shape.y + shape.height / 2}" rx="${Math.abs(shape.width) / 2}" ry="${Math.abs(shape.height) / 2}" ${stroke}/>`;
      }
      return `<rect x="${Math.min(shape.x, shape.x + shape.width)}" y="${Math.min(shape.y, shape.y + shape.height)}" width="${Math.abs(shape.width)}" height="${Math.abs(shape.height)}" ${stroke}/>`;
    }).join("");
    const noteMarkup = notes.map((note) => {
      const lines = note.text.split("\n").map((line, index) =>
        `<tspan x="${note.x + 10}" dy="${index === 0 ? 0 : 18}">${escapeXml(line)}</tspan>`
      ).join("");
      return `<g><rect x="${note.x}" y="${note.y}" width="176" height="160" rx="5" fill="${escapeXml(note.color)}"/><text x="${note.x + 10}" y="${note.y + 44}" fill="#111827" font-family="Arial,sans-serif" font-size="14">${lines}</text></g>`;
    }).join("");
    const canvasColor = darkMode ? "#111318" : "#fafafa";
    const gridColor = darkMode ? "#343741" : "#d4d4d8";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="${gridColor}"/></pattern></defs><rect width="100%" height="100%" fill="${canvasColor}"/><rect width="100%" height="100%" fill="url(#grid)"/>${strokeMarkup}${shapeMarkup}${noteMarkup}</svg>`;
    const file = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const sourceUrl = URL.createObjectURL(file);
    let downloadUrl = sourceUrl;
    const link = document.createElement("a");
    link.download = `canvas-${roomId.replace(/[^\w-]/g, "_")}.${format}`;

    try {
      if (format === "svg") {
        link.href = sourceUrl;
      } else {
        const image = new Image();
        image.src = sourceUrl;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Could not create an image export context.");
        context.scale(window.devicePixelRatio, window.devicePixelRatio);
        context.drawImage(image, 0, 0, width, height);
        const png = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("The browser could not create a PNG.")), "image/png");
        });
        downloadUrl = URL.createObjectURL(png);
        link.href = downloadUrl;
      }
      document.body.appendChild(link);
      link.click();
      link.remove();
      setExportMessage(`Board exported as ${format.toUpperCase()}.`);
      window.setTimeout(() => setExportMessage(""), 2500);
    } catch (error) {
      console.error("Board export failed.", error);
      setExportMessage("Export failed. Please try again.");
      window.setTimeout(() => setExportMessage(""), 3500);
    } finally {
      link.remove();
      URL.revokeObjectURL(sourceUrl);
      if (downloadUrl !== sourceUrl) URL.revokeObjectURL(downloadUrl);
    }
  };

  const pos = (e: PE) => toWorldPosition(e.clientX, e.clientY, zoom, pan);

  const down = (e: PE<SVGSVGElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const position = pos(e);
    if (tool === "pan") {
      panStart.current = { clientX: e.clientX, clientY: e.clientY, x: pan.x, y: pan.y };
      return;
    }
    if (tool === "eraser") {
      eraseAt(position);
      return;
    }
    if (tool === "pen") {
      draft.current = { points: [[position.x, position.y, e.pressure]], color, size: SIZE };
      setMe({ draft: draft.current, draftShape: null, cursor: pos(e) });
    } else {
      shapeDraft.current = {
        id: crypto.randomUUID(), kind: tool, x: position.x, y: position.y,
        width: 0, height: 0, color, strokeWidth: SIZE,
      };
      setShapePreview(shapeDraft.current);
      setMe({ draft: null, draftShape: shapeDraft.current, cursor: pos(e) });
    }
  };
  const move = (e: PE<SVGSVGElement>) => {
    if (panStart.current) {
      const nextPan = {
        x: panStart.current.x + e.clientX - panStart.current.clientX,
        y: panStart.current.y + e.clientY - panStart.current.clientY,
      };
      setPan(nextPan);
      setMe({ cursor: toWorldPosition(e.clientX, e.clientY, zoom, nextPan) });
    } else if (tool === "eraser" && e.buttons === 1) {
      eraseAt(pos(e));
      setMe({ cursor: pos(e) });
    } else if (draft.current) {
      const position = pos(e);
      draft.current = { ...draft.current, points: [...draft.current.points, [position.x, position.y, e.pressure]] };
      setMe({ draft: draft.current, cursor: pos(e) });
    } else if (shapeDraft.current) {
      const position = pos(e);
      shapeDraft.current = {
        ...shapeDraft.current,
        width: position.x - shapeDraft.current.x,
        height: position.y - shapeDraft.current.y,
      };
      setShapePreview(shapeDraft.current);
      setMe({ draftShape: shapeDraft.current, cursor: pos(e) });
    } else setMe({ cursor: pos(e) });
  };
  const up = (e: PE<SVGSVGElement>) => {
    panStart.current = null;
    if (e.button !== 0) return;
    if (draft.current) {
      const position = pos(e);
      draft.current = { ...draft.current, points: [...draft.current.points, [position.x, position.y, e.pressure]] };
    }
    if (shapeDraft.current) {
      const position = pos(e);
      shapeDraft.current = {
        ...shapeDraft.current,
        width: position.x - shapeDraft.current.x,
        height: position.y - shapeDraft.current.y,
      };
    }
    if (draft.current && draft.current.points.length > 1) addStroke(draft.current);
    if (shapeDraft.current && (Math.abs(shapeDraft.current.width) > 2 || Math.abs(shapeDraft.current.height) > 2)) {
      addShape(shapeDraft.current);
    }
    draft.current = null;
    shapeDraft.current = null;
    setShapePreview(null);
    setMe({ draft: null, draftShape: null });
  };
  const cancelGesture = () => {
    panStart.current = null;
    draft.current = null;
    shapeDraft.current = null;
    setShapePreview(null);
    setMe({ draft: null, draftShape: null });
  };

  return (
    <main className="board-shell relative h-screen w-screen overflow-hidden" data-theme={darkMode ? "dark" : "light"}>
      <div
        className="absolute inset-0"
        style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center" }}
      >
        <svg
          className={`absolute inset-0 h-full w-full touch-none ${
            tool === "pan" ? (panStart.current ? "cursor-grabbing" : "cursor-grab")
              : tool === "eraser" ? "cursor-crosshair"
                : tool === "pen" ? "cursor-crosshair" : "cursor-cell"
          }`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={cancelGesture}
          onPointerLeave={() => setMe({ cursor: null })}
        >
          <rect width="100%" height="100%" fill="transparent" pointerEvents="all" />
          {strokes.map((s, i) => <path key={i} d={toPath(s as Stroke)} fill={s.color} />)}
          {shapes.map((shape) => <ShapeView key={shape.id} shape={shape} />)}
          {others.map(({ connectionId, presence }) =>
            presence.draft ? <path key={connectionId} d={toPath(presence.draft)} fill={presence.draft.color} opacity={0.8} /> : null
          )}
          {others.map(({ connectionId, presence }) =>
            presence.draftShape ? <ShapeView key={`shape-${connectionId}`} shape={presence.draftShape} preview /> : null
          )}
          {me.draft && <path d={toPath(me.draft)} fill={me.draft.color} />}
          {shapePreview && <ShapeView shape={shapePreview} preview />}
        </svg>

        {noteIds.map((id) => <StickyNote key={id} id={id} zoom={zoom} pan={pan} />)}

        {others.map(({ connectionId, presence }) =>
          presence.cursor ? <Cursor key={connectionId} {...presence.cursor} color={presence.color} name={presence.name} /> : null
        )}
      </div>

      <header className="board-panel board-header fixed left-5 top-5 z-40 flex items-center gap-3 rounded-2xl border px-4 py-2.5 shadow-lg backdrop-blur">
        <a href="/" className="font-bold tracking-tight">canvas<span className="text-violet-600">.</span></a>
        <span className="board-divider h-5 w-px" />
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1800);
            } catch {
              window.alert("Clipboard access is unavailable. Copy the URL from your address bar.");
            }
          }}
          className="board-muted rounded-lg text-sm font-medium hover:text-violet-500"
        >
          {copied ? "Copied!" : "Share board"}
        </button>
        <button
          onClick={toggleTheme}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          aria-pressed={darkMode}
          title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium"
        >
          {darkMode ? "☀ Light" : "☾ Dark"}
        </button>
      </header>

      <div className="board-panel board-export-panel fixed right-5 top-5 z-40 flex items-center gap-2 rounded-2xl border p-2 shadow-lg backdrop-blur">
        <button
          onClick={() => setZoom((current) => Math.max(MIN_ZOOM, Math.round((current - ZOOM_STEP) * 10) / 10))}
          disabled={zoom <= MIN_ZOOM}
          aria-label="Zoom out"
          title="Zoom out"
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >−</button>
        <button
          onClick={() => setZoom(1)}
          aria-label={`Reset zoom, currently ${Math.round(zoom * 100)}%`}
          title="Reset zoom"
          className="board-muted min-w-12 rounded-lg px-1 py-1.5 text-center text-xs font-medium"
        >{Math.round(zoom * 100)}%</button>
        <button
          onClick={() => setZoom((current) => Math.min(MAX_ZOOM, Math.round((current + ZOOM_STEP) * 10) / 10))}
          disabled={zoom >= MAX_ZOOM}
          aria-label="Zoom in"
          title="Zoom in"
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >+</button>
        <button
          onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
          aria-label="Reset zoom and center the board"
          title="Reset view (0)"
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium"
        >⌖</button>
        <span className="board-divider mx-0.5 h-6 w-px" />
        <button onClick={() => void exportBoard("svg")} className="board-button rounded-lg px-3 py-1.5 text-sm font-medium">Export SVG</button>
        <button onClick={() => void exportBoard("png")} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700">Export PNG</button>
      </div>

      <div className="board-panel board-toolbar fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border px-3 py-2 shadow-xl backdrop-blur">
        <button
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl/⌘ Z)"
          aria-label="Undo"
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35"
        >↶</button>
        <button
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl/⌘ Shift Z)"
          aria-label="Redo"
          className="board-button rounded-lg px-2.5 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-35"
        >↷</button>
        <span className="board-divider mx-1 h-6 w-px" />
        {(["pan", "pen", "eraser", "rectangle", "ellipse", "line", "arrow"] as Tool[]).map((item) => (
          <button
            key={item}
            onClick={() => setTool(item)}
            aria-label={`Select ${item} tool`}
            title={`${item[0].toUpperCase() + item.slice(1)}${item === "pan" ? " (H)" : item === "pen" ? " (P)" : item === "eraser" ? " (E)" : item === "arrow" ? " (A)" : ""}`}
            className={`rounded-lg px-2.5 py-1.5 text-sm font-medium capitalize ${tool === item ? "bg-violet-100 text-violet-800" : "board-button"}`}
          >
            {item === "pan" ? "✋" : item === "pen" ? "✎" : item === "eraser" ? "⌫"
              : item === "rectangle" ? "□" : item === "ellipse" ? "◯"
                : item === "line" ? "／" : "➜"}
          </button>
        ))}
        <span className="board-divider mx-1 h-6 w-px" />
        {COLORS.map((c) => (
          <button
            key={c}
            aria-label={c}
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full transition ${color === c ? "scale-110 ring-2 ring-offset-2 ring-gray-900" : "hover:scale-110"}`}
            style={{ background: c }}
          />
        ))}
        <span className="board-divider mx-1 h-6 w-px" />
        <button onClick={() => addNote()} className="board-button rounded-lg px-3 py-1.5 text-sm font-medium">
          + Note
        </button>
        <button onClick={() => clear()} className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
          Clear
        </button>
        <span className="board-badge ml-1 rounded-full px-2 py-0.5 text-xs">{others.length + 1} online</span>
      </div>
      {exportMessage && <div role="status" className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-lg">{exportMessage}</div>}
    </main>
  );
}

function ShapeView({ shape, preview = false }: { shape: Shape; preview?: boolean }) {
  const style = { fill: "none", stroke: shape.color, strokeWidth: shape.strokeWidth, opacity: preview ? 0.75 : 1 };
  if (shape.kind === "line" || shape.kind === "arrow") {
    return (
      <g>
        <line x1={shape.x} y1={shape.y} x2={shape.x + shape.width} y2={shape.y + shape.height} {...style} />
        {shape.kind === "arrow" && (
          <polygon points={arrowHeadPoints(shape)} fill={shape.color} opacity={preview ? 0.75 : 1} />
        )}
      </g>
    );
  }
  if (shape.kind === "ellipse") {
    return (
      <ellipse
        cx={shape.x + shape.width / 2}
        cy={shape.y + shape.height / 2}
        rx={Math.abs(shape.width) / 2}
        ry={Math.abs(shape.height) / 2}
        {...style}
      />
    );
  }
  return (
    <rect
      x={Math.min(shape.x, shape.x + shape.width)}
      y={Math.min(shape.y, shape.y + shape.height)}
      width={Math.abs(shape.width)}
      height={Math.abs(shape.height)}
      {...style}
    />
  );
}

export default function Page() {
  const { roomId } = useParams<{ roomId: string }>();
  const [init] = useState(() => ({
    cursor: null,
    draft: null,
    draftShape: null,
    name: `User ${Math.floor(Math.random() * 900 + 100)}`,
    color: COLORS[1 + Math.floor(Math.random() * (COLORS.length - 1))],
  }));

  return (
    <RoomProvider id={`whiteboard:${roomId}`} initialPresence={init} initialStorage={initialStorage}>
      <ClientSideSuspense fallback={<div className="grid h-screen place-items-center text-gray-400">Loading…</div>}>
        <Board roomId={roomId} />
      </ClientSideSuspense>
    </RoomProvider>
  );
}
