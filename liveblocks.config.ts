import { createClient, LiveList } from "@liveblocks/client";
import type { LiveObject } from "@liveblocks/client";
import { createRoomContext, ClientSideSuspense } from "@liveblocks/react";
import type { Presence, Storage, UserMeta, Note } from "./types";

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
  throttle: 16,
});

const { RoomProvider, suspense } = createRoomContext<Presence, Storage, UserMeta>(client);

export const {
  useOthers, useMyPresence, useStorage, useMutation, useUndo, useRedo, useCanUndo, useCanRedo,
} = suspense;
export { RoomProvider, ClientSideSuspense };

export const initialStorage = (): Storage => ({
  strokes: new LiveList([]),
  shapes: new LiveList([]),
  notes: new LiveList<LiveObject<Note>>([]),
});
