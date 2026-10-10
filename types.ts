import type { LiveList, LiveObject } from "@liveblocks/client";

export type Stroke = { points: number[][]; color: string; size: number };
export type Shape = {
  id: string;
  kind: "rectangle" | "ellipse" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
};
export type Note = { id: string; x: number; y: number; text: string; color: string };

export type Presence = {
  cursor: { x: number; y: number } | null;
  draft: Stroke | null;
  draftShape: Shape | null;
  name: string;
  color: string;
};

export type Storage = {
  strokes: LiveList<Stroke>;
  shapes: LiveList<Shape>;
  notes: LiveList<LiveObject<Note>>;
};

export type UserMeta = { id?: string; info?: { name: string } };
