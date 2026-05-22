"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#131315] text-[#e5e1e4] px-4">
      {/* Shield icon */}
      <div className="mb-8 relative">
        <div className="w-24 h-24 rounded-2xl bg-[#1c1b1d] border border-[#27272A] flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-12 h-12 text-[#4edea3]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
            />
          </svg>
        </div>
        {/* Glitch effect badge */}
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#f95c5c] flex items-center justify-center text-xs font-bold text-white">
          !
        </div>
      </div>

      {/* Error code */}
      <div className="font-mono text-[80px] font-bold leading-none text-[#27272A] select-none mb-2">
        404
      </div>

      {/* Message */}
      <h1 className="text-2xl font-semibold mb-2">
        No attack here — page not found.
      </h1>
      <p className="text-[#bbcabf] text-sm mb-8 text-center max-w-sm">
        The route you're looking for doesn't exist. No prompt injection
        detected — just a missing page.
      </p>

      {/* Terminal-style hint */}
      <div className="font-mono text-xs bg-[#1c1b1d] border border-[#27272A] rounded-lg px-4 py-3 mb-8 text-[#4edea3]">
        <span className="text-[#bbcabf]">$ </span>
        curl http://localhost:8000/health
        <br />
        <span className="text-[#bbcabf]">{"{ "}</span>
        <span className="text-[#4edea3]">"status"</span>
        <span className="text-[#bbcabf]">: </span>
        <span className="text-amber-400">"ok"</span>
        <span className="text-[#bbcabf]">{" }"}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/live"
          className="px-4 py-2 rounded-lg bg-[#4edea3] text-[#003824] text-sm font-semibold hover:bg-[#6ee7b7] transition-colors"
        >
          Live Feed
        </Link>
        <Link
          href="/incidents"
          className="px-4 py-2 rounded-lg bg-[#1c1b1d] border border-[#27272A] text-[#e5e1e4] text-sm font-medium hover:bg-[#201f22] transition-colors"
        >
          Incidents
        </Link>
      </div>
    </div>
  );
}
