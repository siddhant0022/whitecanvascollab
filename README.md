# Canvas

A collaborative whiteboard with freehand drawing, shapes, sticky notes, live cursors, shared undo/redo, board exports, and guest access through shared board links.

## Setup

1. Create a Liveblocks project and add its public API key to `.env.local` as `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`.
2. Create a Clerk application and add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`.
3. Install dependencies and start the app:

   ```sh
   npm install
   npm run dev
   ```

4. Set your Clerk sign-in and sign-up URLs to `/` (the landing page opens the Clerk modal).
5. Visit `http://localhost:3000`. Sign in to create a board, or join a shared board link as a guest.

Board contents and presence are synchronized with Liveblocks. Anyone with a board URL can join it; only creating a new board is protected by sign-in.

## Board controls

- Draw with the pen or select rectangle, ellipse, and line tools. Press `P`, `R`, `O`, or `L` to switch tools.
- Press `N` to add a sticky note.
- Undo with `Ctrl/⌘ Z`; redo with `Ctrl/⌘ Shift Z` or `Ctrl Y`.
- Export the board as an SVG or PNG from the top-right controls.
