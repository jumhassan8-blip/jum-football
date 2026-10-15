"use client";

import { useState } from "react";
import LegalPage from "@/components/LegalPage";
import { useToast } from "@/lib/store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ContactPage() {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — bots fill it, humans never see it
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0);

  const submit = async () => {
    if (website) return; // honeypot tripped — pretend success, store nothing
    if (!name.trim() || !EMAIL_RE.test(email) || !message.trim()) {
      toast("Please fill in every field with a valid email.");
      return;
    }
    // client-side rate limit: max 1 submit / 10s
    if (Date.now() - lastSent < 10_000) {
      toast("Please wait a few seconds before sending again.");
      return;
    }
    setSending(true);
    try {
      const { getFirestoreDb } = await import("@/lib/firebase");
      const db = await getFirestoreDb();
      if (db) {
        const { collection, addDoc } = await import("firebase/firestore");
        await addDoc(collection(db, "contacts"), {
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
          createdAt: new Date().toISOString(),
        });
      }
      setLastSent(Date.now());
      setName(""); setEmail(""); setMessage("");
      toast("Thanks — your message has been sent.");
    } catch {
      toast("Couldn't send right now. Email us at contact@jumfootball.com.");
    } finally {
      setSending(false);
    }
  };

  return (
    <LegalPage title="Contact" subtitle="We read every message.">
      <div className="space-y-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-dim">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg px-3 py-2.5 text-[13px] text-white ring-1 ring-divider focus:outline-none focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-dim">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg bg-bg px-3 py-2.5 text-[13px] text-white ring-1 ring-divider focus:outline-none focus:ring-accent"
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-dim">Message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="mt-1 w-full resize-none rounded-lg bg-bg px-3 py-2.5 text-[13px] text-white ring-1 ring-divider focus:outline-none focus:ring-accent"
          />
        </label>
        {/* honeypot: invisible to humans, bots fill it */}
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <button
          onClick={submit}
          disabled={sending}
          className="min-h-[44px] w-full rounded-full bg-accent text-[13px] font-black text-bg transition-opacity disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send message"}
        </button>
      </div>
    </LegalPage>
  );
}
