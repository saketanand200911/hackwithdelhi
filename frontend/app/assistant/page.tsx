"use client";

import React, { useState } from "react";
import { Bot, Send, RefreshCw, MessageSquare, HelpCircle } from "lucide-react";

const API_BASE = "http://127.0.0.1:8000";

export default function AssistantPage() {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ca"; text: string }>>([
    {
      sender: "ca",
      text: "Namaste Sharma Ji! Mai aapka Vyaapar CA Assistant hoon. Aapke khareedari bills me se tax bachaane aur audit notice se bachne me mai aapki madad karunga. Koi bhi sawal poochiye!"
    }
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || query;
    if (!q.trim()) return;

    setMessages((prev) => [...prev, { sender: "user", text: q }]);
    setQuery("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai-ca/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { sender: "ca", text: data.response }]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl flex-1 flex flex-col min-h-[580px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Vyaapar CA
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                  Financial Buddy
                </span>
              </h1>
              <p className="text-xs text-slate-400">Poochiye koi bhi GST, HSN ya parchi se juda sawal Hindi/Hinglish me</p>
            </div>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full font-medium">
            Online
          </span>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto py-5 flex flex-col gap-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                  m.sender === "user"
                    ? "bg-orange-500 text-slate-950 font-semibold"
                    : "bg-slate-950 border border-slate-800 text-slate-200"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-950 border border-slate-800 text-slate-400 text-xs px-4 py-2.5 rounded-2xl flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                Vyaapar CA hisaab dekh rahe hain...
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggested Prompts */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => handleSend("ITC kya hota hai aur kab reject hota hai?")}
            className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            💡 ITC kya hota hai?
          </button>
          <button
            onClick={() => handleSend("HSN code galat hone se kya nuksan hai?")}
            className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            💡 HSN code galat hone se nuksan?
          </button>
          <button
            onClick={() => handleSend("Vendor ka GSTIN fake ho toh kya penalty lagegi?")}
            className="text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            💡 Fake GSTIN pe kya penalty hai?
          </button>
        </div>

        {/* Input Field */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Aapna sawal likhiye (e.g. Sariya par GST kitna lagta hai?)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={() => handleSend()}
            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
