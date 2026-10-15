"use client";

import { useMemo, useRef, useState } from "react";
import { Heart, MessageCircle, Send } from "lucide-react";
import type { Match } from "@/lib/jumMock";
import { chatFor } from "@/lib/api";
import { awardFanPoints, useChat } from "@/lib/store";
import { useT } from "@/lib/i18n";

const FAN_ESTIMATE = 1200;

/** Live match chat — seeded, persisted to localStorage, top comment auto-pinned. */
export default function LiveChat({ match }: { match: Match }) {
  const t = useT();
  const seed = useMemo(() => chatFor(match.id), [match.id]);
  const { msgs, send, like } = useChat(match.id, seed);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pinned = useMemo(() => [...msgs].sort((a, b) => b.likes - a.likes)[0], [msgs]);
  const rest = useMemo(() => msgs.filter((m) => m.id !== pinned?.id), [msgs, pinned]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    send(text, match.minute ?? 90);
    awardFanPoints(5);
    setDraft("");
  };

  return (
    <section className="rounded-card bg-card">
      <div className="flex items-center justify-between border-b border-divider px-4 py-3">
        <h3 className="text-[13px] font-extrabold">
          Live Chat · <span className="text-accent">{(FAN_ESTIMATE + msgs.length).toLocaleString()} fans</span>
        </h3>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-dim">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-live" />
          LIVE
        </span>
      </div>

      {pinned && (
        <div className="flex gap-2.5 border-b border-divider bg-gold/[0.05] px-4 py-3">
          <span className="rounded-md bg-gold/15 px-1.5 py-0.5 text-[9px] font-black text-gold">🔥 Top Fan</span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold">
              <span style={{ color: pinned.color }}>{pinned.fan}</span>
              {pinned.superFan && <span className="ml-1.5 rounded bg-accent/15 px-1 text-[8px] font-black text-accent">SUPER FAN</span>}
              <span className="ml-1.5 text-[10px] font-normal text-dim">{pinned.minute}&prime;</span>
            </p>
            <p className="mt-0.5 text-[12px] text-white/85">{pinned.text}</p>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-bold text-gold">
            <Heart size={12} fill="currentColor" /> {pinned.likes}
          </span>
        </div>
      )}

      <div className="max-h-72 space-y-1 overflow-y-auto px-4 py-2">
        {rest.map((m) => (
          <div key={m.id} className="flex gap-2.5 py-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
              style={{ backgroundColor: `${m.color}22`, color: m.color, border: `1px solid ${m.color}55` }}
            >
              {m.fan.slice(0, 1).toUpperCase()}
            </span>
            <div className="flex-1">
              <p className="text-[11px] font-bold">
                <span style={{ color: m.color }}>{m.fan}</span>
                {m.superFan && <span className="ml-1.5 rounded bg-accent/15 px-1 text-[8px] font-black text-accent">SUPER FAN</span>}
                <span className="ml-1.5 font-normal text-dim">{m.minute}&prime;</span>
              </p>
              <p className="text-[12px] text-white/85">{m.text}</p>
              <div className="mt-1 flex items-center gap-3">
                <button
                  onClick={() => {
                    like(m.id);
                    if (!m.likedByMe) awardFanPoints(1);
                  }}
                  aria-label={t("a11y.likeComment")}
                  className={`flex items-center gap-1 text-[10px] font-bold ${m.likedByMe ? "text-live" : "text-dim hover:text-live"}`}
                >
                  <Heart size={11} fill={m.likedByMe ? "currentColor" : "none"} /> {m.likes}
                </button>
                <button
                  onClick={() => {
                    setDraft(`@${m.fan} `);
                    inputRef.current?.focus();
                  }}
                  className="flex items-center gap-1 text-[10px] font-bold text-dim hover:text-white"
                >
                  <MessageCircle size={11} /> Reply
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-divider p-3">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("watch.joinChat")}
          className="min-h-[40px] flex-1 rounded-full bg-black/40 px-4 text-[12px] outline-none ring-1 ring-white/10 placeholder:text-dim/60 focus:ring-accent/50"
        />
        <button
          onClick={submit}
          aria-label={t("a11y.sendMessage")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-bg transition hover:brightness-110"
        >
          <Send size={16} />
        </button>
      </div>
    </section>
  );
}
