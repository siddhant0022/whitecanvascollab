# WhiteCanvas

WhiteCanvas is a collaborative online whiteboard built with Next.js, Clerk, Liveblocks, React, Tailwind CSS, and Perfect Freehand. It lets signed-in users create shareable boards, while guests can join existing boards through a board link or room ID.

The app supports real-time drawing, shapes, sticky notes, live cursors, shared undo/redo, and board export to SVG or PNG.

## Features

- Real-time collaborative whiteboard rooms powered by Liveblocks
- Clerk authentication for creating new boards
- Guest access for shared board links
- Freehand pen drawing with smooth strokes from `perfect-freehand`
- Rectangle, ellipse, and line shape tools
- Sticky notes with draggable positioning and editable text
- Live collaborator cursors with user names and colors
- Shared undo and redo support
- Board clearing
- Shareable board URLs
- SVG and PNG export
- Tailwind CSS styling

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Clerk
- Liveblocks
- Perfect Freehand
- npm

## Project Structure

```text
whitecanvascollab/
|-- app/
|   |-- globals.css              # Global Tailwind styles
|   |-- layout.tsx               # Root app layout and providers
|   |-- page.tsx                 # Landing page, auth buttons, and join-board form
|   |-- new/
|   |   `-- page.tsx             # Protected board creation route
|   `-- room/
|       `-- [roomId]/
|           `-- page.tsx         # Collaborative whiteboard room
|-- liveblocks.config.ts         # Liveblocks client, room hooks, and initial storage
|-- middleware.ts                # Clerk route protection for board creation
|-- types.ts                     # Shared whiteboard, presence, and storage types
|-- next.config.mjs              # Next.js configuration
|-- tailwind.config.ts           # Tailwind configuration
|-- postcss.config.mjs           # PostCSS configuration
|-- tsconfig.json                # TypeScript configuration
|-- package.json                 # Dependencies and npm scripts
`-- package-lock.json            # Locked npm dependency versions
```

## Routes

### `/`

Landing page for the application. Users can sign in, sign up, create a new board, or join an existing board by pasting a board link or room ID.

### `/new`

Protected route used to create a new board. Clerk requires authentication before this route can be accessed. After authentication, the route redirects to a new room using a short random ID.

### `/room/[roomId]`

Main collaborative whiteboard route. The room ID is used to create a Liveblocks room with the format:

```text
whiteboard:<roomId>
```

Anyone with a valid room link can join the board.

## Environment Variables

Create a `.env.local` file in `whitecanvascollab/` and add the following values:

```env
NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY=your_liveblocks_public_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
```

### Liveblocks

Create a Liveblocks project and copy its public API key into `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY`.

Liveblocks stores and syncs:

- Pen strokes
- Shapes
- Sticky notes
- Presence data, including cursors and in-progress drawings
- Shared undo/redo history

### Clerk

Create a Clerk application and copy the publishable and secret keys into `.env.local`.

Recommended Clerk URL configuration:

- Sign-in URL: `/`
- Sign-up URL: `/`

The landing page opens Clerk sign-in and sign-up flows in modals. Creating a board through `/new` requires authentication.

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm
- A Clerk application
- A Liveblocks project

### Installation

From the repository root:

```bash
cd whitecanvascollab
npm install
```

### Run the Development Server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
npm run dev
```

Starts the Next.js development server.

```bash
npm run build
```

Creates a production build.

```bash
npm run start
```

Starts the production server after a successful build.

## How to Use

### Create a Board

1. Visit `http://localhost:3000`.
2. Sign in or sign up with Clerk.
3. Select the create/open workspace action.
4. The app redirects to a new board at `/room/[roomId]`.

### Join a Board

1. Open the landing page.
2. Paste a board URL or room ID into the join form.
3. Join the board directly.

Guests can join shared board links without signing in.

### Share a Board

Use the **Share board** control inside a room. The app copies the current board URL to the clipboard.

## Board Controls

- Pen: draw freehand strokes
- Rectangle: draw rectangular outlines
- Ellipse: draw oval outlines
- Line: draw straight lines
- Color swatches: change the active drawing color
- `+ Note`: add a sticky note
- Clear: remove all strokes, shapes, and notes from the board
- Undo: revert the latest shared change
- Redo: reapply an undone shared change
- Export SVG: download the current board as an SVG file
- Export PNG: download the current board as a PNG file

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `P` | Select pen tool |
| `R` | Select rectangle tool |
| `O` | Select ellipse tool |
| `L` | Select line tool |
| `N` | Add sticky note |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | Redo |
| `Ctrl + Y` | Redo |

Keyboard shortcuts are disabled while typing in form fields or sticky notes.

## Data Model

The shared Liveblocks storage is defined in `types.ts` and initialized in `liveblocks.config.ts`.

Storage includes:

- `strokes`: freehand drawing paths with points, color, and size
- `shapes`: rectangle, ellipse, and line objects
- `notes`: sticky note objects with position, text, and color

Presence includes:

- Current cursor position
- In-progress pen stroke
- In-progress shape
- User display name
- User color

## Build and Production

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

Before deploying, make sure the required Clerk and Liveblocks environment variables are configured in the hosting provider.

This project can be deployed to platforms that support Next.js applications, such as Vercel or other Node-compatible hosts.

## Troubleshooting

### Missing Liveblocks key

If the board fails to connect or crashes on load, confirm that `NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY` exists in `.env.local`.

### Authentication does not work

Check that both Clerk keys are present:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

Also confirm the Clerk sign-in and sign-up URLs point to `/`.

### Guests cannot join a board

Make sure the shared URL points to a valid route:

```text
/room/[roomId]
```

The join form accepts full board URLs, `/room/[roomId]` paths, or plain room IDs.

### Build fails

Run a clean install and rebuild:

```bash
npm install
npm run build
```

If errors mention missing environment variables, add the required values before running the app.

## Contributing

1. Create a branch for your change.
2. Keep changes focused and easy to review.
3. Run the app locally with `npm run dev`.
4. Run `npm run build` before opening a pull request.
5. Update this README when setup, routes, scripts, or environment variables change.
