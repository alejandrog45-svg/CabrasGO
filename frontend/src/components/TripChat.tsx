import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderRole: "PASSENGER" | "DRIVER";
  text: string;
  createdAt: string;
}

// Chat en vivo acotado a un viaje. `apiBase` es "/passenger" o "/driver"
// (cada rol tiene su propio endpoint con su propia validación de dueño del
// viaje). `myRole` decide qué burbujas se alinean a la derecha.
export function TripChat({
  tripId,
  apiBase,
  myRole,
  dark,
}: {
  tripId: string;
  apiBase: "/passenger" | "/driver";
  myRole: "PASSENGER" | "DRIVER";
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TripMessage[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("join:trip", tripId);
    api.get<{ messages: TripMessage[] }>(`${apiBase}/trips/${tripId}/messages`).then((d) => setMessages(d.messages));

    const onMessage = (msg: TripMessage) => {
      if (msg.tripId !== tripId) return;
      setMessages((m) => [...m, msg]);
      if (msg.senderRole !== myRole) setUnread((u) => u + 1);
    };
    socket.on("trip:message", onMessage);
    return () => {
      socket.off("trip:message", onMessage);
    };
  }, [tripId]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
    }
  }, [open, messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    try {
      await api.post(`${apiBase}/trips/${tripId}/messages`, { text: trimmed });
    } catch {
      /* el socket igual refleja mensajes de la otra parte; si falla el envío el input ya se limpió, se pierde el reintento simple por ahora */
    }
  }

  const surface = dark ? "bg-cg-darkSurface border-slate-800" : "bg-white border-slate-200";
  const bubbleMine = dark ? "bg-cg-driver text-white" : "bg-cg-accent text-black";
  const bubbleTheirs = dark ? "bg-cg-darkSurfaceAlt text-cg-darkPrimary" : "bg-slate-100 text-slate-900";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`relative w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold border ${surface}`}
      >
        💬 Chat con {myRole === "PASSENGER" ? "el conductor" : "el pasajero"}
        {unread > 0 && (
          <span className="absolute right-3 bg-cg-danger text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className={`rounded-2xl border ${surface} overflow-hidden`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Chat del viaje</span>
        <button onClick={() => setOpen(false)} className="text-slate-400 text-sm font-bold">✕</button>
      </div>
      <div ref={listRef} className="max-h-56 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Sin mensajes todavía.</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderRole === myRole ? "justify-end" : "justify-start"}`}>
            <span className={`inline-block max-w-[80%] rounded-xl px-3 py-1.5 text-sm ${m.senderRole === myRole ? bubbleMine : bubbleTheirs}`}>
              {m.text}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-2 border-t border-inherit">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Escribe un mensaje..."
          maxLength={500}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${dark ? "bg-cg-darkSurfaceAlt text-cg-darkPrimary" : "bg-slate-100"}`}
        />
        <button onClick={send} className="bg-cg-driver text-white font-bold rounded-lg px-3 text-sm">
          Enviar
        </button>
      </div>
    </div>
  );
}
