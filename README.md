# WhiteCanvas

WhiteCanvas is a collaborative online whiteboard built with Next.js, Clerk, Liveblocks, React, Tailwind CSS, and Perfect Freehand. It lets signed-in users create shareable boards, while guests can join existing boards through a board link or room ID.

The app supports real-time drawing, shapes, sticky notes, live cursors, shared undo/redo, and board export to SVG or PNG.

## Features

- Real-time collaborative whiteboard rooms powered by Liveblocks
- Clerk authentication for creating new boards
- Guest access for shared board links
- Freehand pen drawing with smooth strokes from `perfect-freehand`
- Rectangle, ellipse, line, and arrow shape tools
- Eraser for removing strokes, shapes, and notes
- Hand tool for panning around a zoomable board
- Sticky notes with draggable positioning and editable text
- Live collaborator cursors with user names and colors
- Shared undo and redo support
- Board clearing
- Dark and light canvas themes, with the preference saved in the browser
- Canvas zoom controls (50%–200%), panning, and drawing/note coordinate handling
- Responsive board controls for desktop, tablet, and mobile layouts
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
|   |-- globals.css              # Global Tailwind styles and responsive/theme-aware board styles
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

### Change the Theme and Zoom

- Select **Dark** or **Light** in the board header. The canvas and its grid switch themes; the choice is saved in that browser.
- Use **−** and **+** to zoom from 50% to 200%. The percentage button resets the view to 100%.
- The board toolbar wraps on smaller screens, and export and theme controls remain available on phones and tablets.

## Board Controls

- Pen: draw freehand strokes
- Rectangle: draw rectangular outlines
- Ellipse: draw oval outlines
- Line: draw straight lines
- Arrow: draw a directional arrow
- Eraser: remove strokes, shapes, and notes by dragging over them
- Hand/Pan: drag the canvas to move around the board
- Color swatches: change the active drawing color
- `+ Note`: add a sticky note
- Reset view: restore 100% zoom and center the canvas (`0`)
- Clear: remove all strokes, shapes, and notes from the board
- Undo: revert the latest shared change
- Redo: reapply an undone shared change
- Dark/Light: change the local canvas appearance; the preference is stored in browser local storage
- Zoom out/in: scale the board from 50% to 200%; select the percentage to reset to 100%
- Reset view: restore 100% zoom and center the canvas (`0`)
- Export SVG: download the current board as an SVG file
- Export PNG: download the current board as a PNG file

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `P` | Select pen tool |
| `E` | Select eraser tool |
| `H` | Select hand/pan tool |
| `R` | Select rectangle tool |
| `O` | Select ellipse tool |
| `L` | Select line tool |
| `A` | Select arrow tool |
| `N` | Add sticky note |
| `0` | Reset zoom and center the canvas |
| `Ctrl + Z` / `Cmd + Z` | Undo |
| `Ctrl + Shift + Z` / `Cmd + Shift + Z` | Redo |
| `Ctrl + Y` | Redo |

Keyboard shortcuts are disabled while typing in form fields or sticky notes.

## Architecture and Interview Preparation

This section is a concise technical walkthrough of the project and can be used to prepare to explain its design in an interview.

### Request and Authentication Flow

1. The App Router serves the landing page from `app/page.tsx`. It uses Clerk UI components for sign-in and sign-up, and accepts a board URL, `/room/[roomId]` path, or room ID for joining.
2. Creating a board navigates to `/new`. The server route calls Clerk's `auth.protect()` and redirects signed-in users to a room with a generated short ID.
3. `middleware.ts` configures Clerk's route handling. The room route is shareable and is not protected by the board-creation guard, so a person with its link can join as a guest.
4. `app/room/[roomId]/page.tsx` creates a Liveblocks room named `whiteboard:<roomId>`. `RoomProvider` supplies room state, while `ClientSideSuspense` waits for the client-side room UI.

### Real-Time State Model

`types.ts` defines the data contracts. The board has two kinds of state:

- **Storage** is durable, shared room state: `strokes` and `shapes` are LiveLists, and `notes` is a LiveList of LiveObjects so note text and position can be updated. `initialStorage` in `liveblocks.config.ts` initializes these collections for new rooms.
- **Presence** is transient collaborator state: cursor position, active drawing/shape previews, display name, and cursor color. The room renders other users' presence without adding their in-progress gestures to durable storage.

The board adds completed drawings and shapes through Liveblocks mutations. Sticky-note edits and movement update their LiveObject. Liveblocks room history backs shared undo and redo; keyboard shortcuts and toolbar buttons call the same undo/redo hooks.

### Drawing, Zoom, and Export

- Pointer Events drive pen and shape interactions. `perfect-freehand` converts sampled pen points to a smooth filled SVG path; shape tools render SVG rectangles, ellipses, lines, and arrows. Shape previews render locally for immediate feedback and are also broadcast through presence to collaborators.
- The canvas zoom scales the shared board layer around the viewport center, while the hand tool pans it. Pointer coordinates and note dragging are converted back to board coordinates so saved geometry, live cursors, and notes stay aligned at every zoom and pan offset.
- Erasing hit-tests freehand paths, shape outlines, and sticky notes in board coordinates, then removes matching shared storage entries so collaborators see the change and can undo it.
- Theme and viewport controls are local view preferences, not synchronized room content. The light/dark preference is saved to browser local storage; zoom and pan reset when the room is opened again.
- SVG export serializes the current board's strokes, shapes, and notes. PNG export rasterizes that SVG using a canvas at the device pixel ratio. Both exports use the active light or dark canvas background and grid.

### Responsive Design and Accessibility

The landing page uses responsive grid and flex layouts. The board uses viewport-filling canvas layers, wrapping tool controls, smaller-screen spacing, and safe-area insets for mobile devices. Buttons have accessible labels/titles, the zoom level is exposed in its reset control, and export feedback uses a status message.

### Useful Interview Questions

**Why separate Liveblocks Storage and Presence?**

Storage represents shared board content that needs to remain in the room. Presence is short-lived collaboration state such as cursors and draft gestures, which should be visible to peers without being committed as board content.

**How does real-time collaboration work?**

Each board maps its room ID to a Liveblocks room. Clients subscribe to room storage and other users' presence; mutations update shared storage, and presence updates broadcast transient state to connected collaborators.

**How does drawing remain accurate while zoomed?**

The visual board layer is scaled around the viewport center, while pointer screen coordinates are inverse-transformed into the board's coordinate space before a stroke, shape, cursor, or note drag is updated.

**How does the project handle authentication without preventing guests from collaborating?**

Clerk protects the board-creation route. Existing room routes can be opened directly, so authentication is required to create a board but not to join a shared link.

**What would you improve next?**

Add viewport panning and a document-based coordinate system for very large boards; define room-level authorization and persistence requirements for production; add automated tests for drawing geometry, room flows, responsive controls, and export behavior.

### Current Scope and Trade-Offs

- Zoom is centered and bounded between 50% and 200%; panning is available through the hand tool. Infinite-canvas bounds and touch pinch-zoom are not implemented.
- Theme preference is per browser, rather than a shared room preference.
- Strokes and shape geometry use viewport-coordinate units. For a production-scale board that must behave identically across different viewport sizes, a normalized or document-based coordinate model would be a useful next step.
- Room IDs are shareable identifiers, not an authorization mechanism. Configure and enforce the access policy appropriate for the data before using the app for sensitive content.

## Data Model

The shared Liveblocks storage is defined in `types.ts` and initialized in `liveblocks.config.ts`.

Storage includes:

- `strokes`: freehand drawing paths with points, color, and size
- `shapes`: rectangle, ellipse, line, and arrow objects
- `notes`: sticky note objects with position, text, and color

Presence includes:

- Current cursor position
- In-progress pen stroke
- In-progress shape preview
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
