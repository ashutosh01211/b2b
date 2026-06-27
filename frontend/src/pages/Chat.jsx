import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { wsUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function Chat() {
  const { threadId } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [activeThread, setActiveThread] = useState(null);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get("/threads").then(({ data }) => {
      setThreads(data);
      if (!threadId && data[0]) nav(`/chat/${data[0].id}`, { replace: true });
    });
  }, [threadId, nav]);

  useEffect(() => {
    if (!threadId) return;
    api.get(`/threads/${threadId}/messages`).then(({ data }) => setMessages(data));
    const t = threads.find(x => x.id === threadId);
    setActiveThread(t);

    if (wsRef.current) wsRef.current.close();
    const token = localStorage.getItem("token");
    if (!token) return;
    const ws = new WebSocket(wsUrl(threadId, token));
    ws.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === "message") {
          setMessages(prev => prev.find(m => m.id === payload.data.id) ? prev : [...prev, payload.data]);
        }
      } catch (_) { /* ignore */ }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [threadId, threads]);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({ body: text }));
    } else {
      // Fallback REST
      api.post(`/threads/${threadId}/messages`, { thread_id: threadId, body: text }).then(({ data }) => {
        setMessages(prev => [...prev, data]);
      });
    }
    setText("");
  };

  const counterpartName = (t) => user?.role === "buyer" ? t.supplier_name : t.buyer_name;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-50" data-testid="chat-page">
      <div className="max-w-7xl mx-auto h-[calc(100vh-64px)] flex border-x border-slate-200 bg-white">
        <aside className="w-80 border-r border-slate-200 flex flex-col">
          <div className="p-5 border-b border-slate-200">
            <div className="label-eyebrow">Messages</div>
            <h2 className="font-display font-bold text-2xl mt-1">{threads.length} threads</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map(t => (
              <button key={t.id} onClick={() => nav(`/chat/${t.id}`)}
                data-testid={`chat-thread-${t.id}`}
                className={`w-full text-left p-4 border-b border-slate-200 hover:bg-slate-50 ${threadId === t.id ? "bg-slate-100 border-l-2 border-l-[#0047FF]" : ""}`}>
                <div className="font-display font-bold truncate">{counterpartName(t)}</div>
                <div className="text-xs text-slate-500 truncate mt-1">{t.product_title}</div>
              </button>
            ))}
            {threads.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No conversations yet.</div>}
          </div>
        </aside>

        <section className="flex-1 flex flex-col">
          {!threadId || !activeThread ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">Select a conversation</div>
          ) : (
            <>
              <div className="p-5 border-b border-slate-200">
                <div className="label-eyebrow">{activeThread.product_title}</div>
                <h3 className="font-display font-bold text-xl mt-1">{counterpartName(activeThread)}</h3>
              </div>
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
                {messages.map(m => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                      <div className={`max-w-[70%] p-4 border ${mine ? "bg-[#0047FF] text-white border-[#0047FF]" : "bg-white border-slate-200"}`}>
                        <div className={`text-xs font-bold uppercase tracking-widest mb-1 ${mine ? "text-white/70" : "text-slate-500"}`}>{m.sender_name}</div>
                        <div className="whitespace-pre-wrap">{m.body}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="text-center text-slate-400 text-sm">No messages yet — say hello.</div>}
              </div>
              <form onSubmit={send} className="p-4 border-t border-slate-200 flex gap-3">
                <input data-testid="chat-input" className="input-flat flex-1" placeholder="Type a message…" value={text} onChange={e => setText(e.target.value)} />
                <button data-testid="chat-send" className="btn-primary">Send →</button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
