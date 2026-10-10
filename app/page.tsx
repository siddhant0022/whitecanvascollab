"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const [joinError, setJoinError] = useState("");
  const router = useRouter();

  const joinRoom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let id = roomId.trim();
    if (/^https?:\/\//i.test(id)) {
      try {
        const pastedUrl = new URL(id);
        const roomPath = pastedUrl.pathname.match(/^\/room\/([^/]+)\/?$/);
        if (!roomPath) {
          setJoinError("That link doesn't look like a board link.");
          return;
        }
        id = decodeURIComponent(roomPath[1]);
      } catch {
        setJoinError("Enter a valid board link or room ID.");
        return;
      }
    } else {
      const roomPath = id.match(/(?:^|\/)room\/([^/?#]+)/);
      if (roomPath) {
        try {
          id = decodeURIComponent(roomPath[1]);
        } catch {
          setJoinError("Enter a valid board link or room ID.");
          return;
        }
      } else if (/[/?#]/.test(id)) {
        setJoinError("Enter a valid board link or room ID.");
        return;
      }
    }
    if (id) {
      setJoinError("");
      router.push(`/room/${encodeURIComponent(id)}`);
    }
  };

  return (
    <main className="landing-page min-h-screen overflow-hidden text-slate-900">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Link href="/" className="text-2xl font-black tracking-tight">canvas<span className="text-violet-600">.</span></Link>
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton mode="modal" forceRedirectUrl="/new">
              <button className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal" forceRedirectUrl="/new">
              <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/10 hover:bg-violet-700">Get started</button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Link href="/new" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700">Open workspace</Link>
            <UserButton />
          </Show>
        </div>
      </nav>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-24 pt-12 lg:grid-cols-[0.9fr_1.1fr] lg:px-10 lg:pb-32 lg:pt-20">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> A little more room for big ideas
          </div>
          <h1 className="max-w-xl text-5xl font-black leading-[1.04] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
            Think it.<br /><span className="text-violet-600">Draw it.</span><br />Share it.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">
            A collaborative whiteboard for the messy, brilliant first drafts. Sketch together, shape an idea, and keep the whole team in sync.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Show when="signed-out">
              <SignUpButton mode="modal" forceRedirectUrl="/new">
                <button className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700">Create a board <span aria-hidden="true">→</span></button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Link href="/new" className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-violet-600/20 transition hover:-translate-y-0.5 hover:bg-violet-700">Create a board <span aria-hidden="true">→</span></Link>
            </Show>
            <a href="#join" className="rounded-xl border border-slate-200 bg-white/80 px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-200 hover:text-violet-700">Join a board</a>
          </div>
          <div className="mt-9 flex items-center gap-3 text-sm text-slate-500">
            <div className="flex -space-x-2" aria-hidden="true">
              {["bg-amber-300", "bg-rose-300", "bg-sky-300", "bg-emerald-300"].map((color) => <span key={color} className={`h-8 w-8 rounded-full border-2 border-[#faf9ff] ${color}`} />)}
            </div>
            <span>Live collaboration, no setup for guests</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-2xl">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-fuchsia-200/70 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-violet-200/80 blur-3xl" />
          <div className="relative rotate-1 rounded-[2rem] border border-white bg-white/70 p-3 shadow-[0_35px_100px_-35px_rgba(76,29,149,0.35)] backdrop-blur">
            <div className="relative aspect-[1.12/1] overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-[#fcfbff] [background-image:radial-gradient(#d9d3e8_1px,transparent_1px)] [background-size:18px_18px]">
              <div className="absolute left-5 top-5 rounded-xl border border-slate-100 bg-white/90 px-3 py-2 text-xs font-bold shadow-sm">Monday brainstorm <span className="ml-1 text-emerald-500">●</span></div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 500" fill="none" aria-label="Preview of a collaborative whiteboard">
                <path d="M124 177c35-38 59 55 99 18 31-29 47-76 83-35 23 26-2 83 41 87 29 3 37-40 61-27" stroke="#8b5cf6" strokeWidth="8" strokeLinecap="round" />
                <rect x="94" y="262" width="149" height="92" rx="3" transform="rotate(-5 94 262)" fill="#fef08a" />
                <path d="M115 295h98M115 316h74M115 337h58" stroke="#a16207" strokeOpacity=".65" strokeWidth="5" strokeLinecap="round" />
                <ellipse cx="398" cy="294" rx="77" ry="48" stroke="#fb7185" strokeWidth="7" />
                <path d="M350 296h96" stroke="#fb7185" strokeWidth="6" strokeLinecap="round" />
                <rect x="338" y="376" width="134" height="66" rx="12" fill="white" />
                <circle cx="361" cy="398" r="9" fill="#a78bfa" /><path d="M380 398h68M356 420h83" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
                <path d="M477 132l11 29 27 12-27 11-11 29-11-29-27-11 27-12 11-29z" fill="#fbbf24" />
                <path d="M115 105l7 17 17 7-17 7-7 17-7-17-17-7 17-7 7-17z" fill="#34d399" />
              </svg>
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full border border-white bg-white/90 py-1 pl-1 pr-3 shadow-md">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-violet-500 text-[10px] font-bold text-white">A</span>
                <span className="text-xs font-semibold text-slate-600">Alex is sketching</span>
              </div>
              <div className="absolute bottom-6 right-7 h-4 w-4 rotate-[-30deg] rounded-br-full border-b-2 border-r-2 border-violet-700" />
            </div>
          </div>
          <div className="absolute -right-4 top-1/2 hidden -rotate-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm font-bold shadow-xl sm:block">✨ Ideas welcome</div>
        </div>
      </section>

      <section id="join" className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <div className="grid gap-8 rounded-3xl border border-white bg-white/70 p-7 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-10">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">Already have a link?</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">Jump into the conversation.</h2>
            <p className="mt-2 text-sm text-slate-500">Guests can join any shared board without creating an account.</p>
          </div>
          <form onSubmit={joinRoom} className="flex w-full flex-wrap gap-2 md:w-auto">
            <label className="sr-only" htmlFor="room-id">Board link or room ID</label>
            <input
              id="room-id"
              value={roomId}
              onChange={(event) => setRoomId(event.target.value)}
              placeholder="Paste a board link or ID"
              aria-invalid={Boolean(joinError)}
              aria-describedby={joinError ? "room-error" : undefined}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 md:w-64"
            />
            <button type="submit" className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white hover:bg-violet-700">Join</button>
            {joinError && <p id="room-error" role="alert" className="w-full text-sm text-red-600">{joinError}</p>}
          </form>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl items-center justify-between border-t border-violet-100/80 px-6 py-6 text-xs text-slate-500 lg:px-10">
        <span className="font-bold text-slate-700">canvas.</span><span>Made for ideas in progress.</span>
      </footer>
    </main>
  );
}
