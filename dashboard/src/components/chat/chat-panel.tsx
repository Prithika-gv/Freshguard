'use client';

import { useState } from 'react';
import { Paperclip, Send, Mic, CheckCheck } from 'lucide-react';
import { chatSeed } from '@/data/mock-data';
import { formatTimestamp } from '@/lib/utils';

export const ChatPanel = ({ title }: { title: string }) => {
  const [messages, setMessages] = useState(chatSeed);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);

  const sendMessage = () => {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), sender: 'admin', author: 'Dispatch HQ', type: 'text', content: draft, sentAt: formatTimestamp(), read: false }]);
    setDraft('');
    setTyping(false);
  };

  return (
    <div className="panel flex h-[520px] flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="metric-label">Integrated Multi-Format Chat Core</p>
          <h3 className="text-2xl text-brand-dark">{title}</h3>
        </div>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Low Latency Connected</span>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pr-2">
        {messages.map((message) => (
          <div key={message.id} className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.sender === 'admin' ? 'ml-auto bg-brand-dark text-white' : 'bg-brand-surface text-slate-800'}`}>
            <p className="text-xs uppercase tracking-[0.24em] opacity-70">{message.author} · {message.type}</p>
            <p className="mt-2 text-sm leading-6">{message.content}</p>
            <div className="mt-2 flex items-center justify-end gap-2 text-[11px] opacity-80">
              <span>{message.sentAt}</span>
              {message.read && <CheckCheck className="h-3.5 w-3.5" />}
            </div>
          </div>
        ))}
        {typing && <p className="text-sm text-slate-500">Driver is typing…</p>}
      </div>
      <div className="mt-4 rounded-2xl border border-brand-dark/10 bg-white p-3">
        <div className="mb-3 flex items-center gap-2 text-slate-500">
          <Paperclip className="h-4 w-4" /> <span className="text-sm">images / documents / audio logs supported</span>
        </div>
        <div className="flex gap-2">
          <input value={draft} onFocus={() => setTyping(true)} onChange={(e) => setDraft(e.target.value)} placeholder="Dispatch secure message" className="flex-1 rounded-2xl border border-brand-dark/15 px-4 py-3 outline-none" />
          <button className="rounded-2xl bg-brand-surface px-4 text-brand-dark"><Mic className="h-4 w-4" /></button>
          <button onClick={sendMessage} className="rounded-2xl bg-brand-dark px-4 text-white"><Send className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
};
