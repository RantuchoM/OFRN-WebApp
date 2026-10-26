import React, { useState, useRef, useEffect, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/supabase";
import {
  IconMessageSquare,
  IconX,
  IconSend,
  IconLoader,
} from "./Icons";
import {
  listFaqChips,
  matchAssistantFaq,
  resolveFaqScreen,
  faqScreenLabel,
} from "../../utils/assistantFaqs";

/** sessionStorage: tras el atajo secreto el FAB queda disponible hasta cerrar la pestaña */
const UNLOCK_KEY = "ofrn_assistant_unlocked";

/**
 * Atajo secreto (chat deshabilitado a la vista):
 * Ctrl + Alt + Shift + A  →  muestra/oculta el botón de ayuda
 */
function isUnlockChord(e) {
  return (
    e.ctrlKey &&
    e.altKey &&
    e.shiftKey &&
    !e.metaKey &&
    (e.code === "KeyA" || e.key === "a" || e.key === "A")
  );
}

export default function AIAssistant() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(UNLOCK_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (!isUnlockChord(e)) return;
      // No robar el atajo si el foco está en un editor rico / input con modifiers raros
      e.preventDefault();
      setUnlocked((prev) => {
        const next = !prev;
        try {
          if (next) sessionStorage.setItem(UNLOCK_KEY, "1");
          else sessionStorage.removeItem(UNLOCK_KEY);
        } catch {
          /* ignore */
        }
        if (!next) setIsOpen(false);
        return next;
      });
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const tab = searchParams.get("tab") || "dashboard";
  const giraId = searchParams.get("giraId");
  const view = searchParams.get("view");
  const subTab = searchParams.get("subTab") || "";

  const faqScreen = useMemo(
    () =>
      resolveFaqScreen({
        tab,
        view,
        subTab,
        giraId,
        pathname: location.pathname,
      }),
    [tab, view, subTab, giraId, location.pathname],
  );

  const screenLabel = faqScreenLabel(faqScreen);

  const virtualPath = useMemo(() => {
    let path = `/${tab}`;
    if (giraId) path += `/${giraId}`;
    if (view) {
      const viewMap = {
        REPERTOIRE: "repertorio",
        LOGISTICS: "logistica",
        ROSTER: "roster",
        AGENDA: "agenda",
        VIATICOS: "viaticos",
        SEATING: "seating",
        DIFUSION: "difusion",
        EDICION: "edicion",
        MEALS_PERSONAL: "mis-comidas",
      };
      path += `/${viewMap[view] || view.toLowerCase()}`;
    }
    if (subTab && (view === "LOGISTICS" || view === "VIATICOS")) {
      path += `/${subTab}`;
    }
    return path;
  }, [tab, giraId, view, subTab]);

  const faqChips = useMemo(() => listFaqChips(faqScreen, 4), [faqScreen]);

  // Al cambiar de pantalla, limpiar el hilo para mostrar las FAQ de esa vista
  useEffect(() => {
    setMessages([]);
    setInput("");
  }, [faqScreen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen, loading]);

  const appendAssistant = (content, meta = {}) => {
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content, source: meta.source || "faq" },
    ]);
  };

  const resolveLocally = (userText) => {
    const hit = matchAssistantFaq(userText, faqScreen);
    if (!hit) return null;
    return {
      role: "assistant",
      content: hit.faq.answer,
      source: "faq",
      faqId: hit.faq.id,
    };
  };

  const handleSendText = async (rawText) => {
    const userText = String(rawText || "").trim();
    if (!userText || loading) return;

    const userMsg = { role: "user", content: userText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const local = resolveLocally(userText);
      if (local) {
        setMessages((prev) => [...prev, local]);
        return;
      }

      const { data, error } = await supabase.functions.invoke("ask-ai", {
        body: {
          messages: [...messages, userMsg],
          userId: user?.id,
          currentPath: virtualPath,
        },
      });

      if (error) throw error;

      const content =
        typeof data?.content === "string"
          ? data.content
          : data?.content ||
            data?.message?.content ||
            (typeof data === "string" ? data : null);

      if (!content) {
        appendAssistant(
          "No hay FAQ para eso en esta pantalla. Reformulá o pedí más detalle (puede usar IA).",
          { source: "fallback" },
        );
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content, source: "ai" },
      ]);
    } catch (err) {
      console.error("Error AI:", err);
      appendAssistant(
        "No pude consultar la IA. Usá las preguntas frecuentes de esta pantalla (sin tokens).",
        { source: "error" },
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => handleSendText(input);

  const handleChip = (faq) => {
    setMessages((prev) => [
      ...prev,
      { role: "user", content: faq.question },
      { role: "assistant", content: faq.answer, source: "faq", faqId: faq.id },
    ]);
  };

  if (!unlocked) return null;

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col items-start font-sans pointer-events-none">
      {isOpen && (
        <div className="mb-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden pointer-events-auto flex flex-col h-[520px] animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="bg-slate-800 p-4 text-white flex justify-between items-center shadow-md shrink-0">
            <div className="min-w-0">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <IconMessageSquare size={16} className="text-slate-300 shrink-0" />
                Ayuda OFRN
              </h3>
              <p className="text-[10px] opacity-90 mt-0.5 truncate" title={screenLabel}>
                FAQ de: <span className="font-semibold">{screenLabel}</span>
              </p>
              <p className="text-[10px] opacity-60">
                4 preguntas de esta vista · IA solo si no hay FAQ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="hover:bg-white/10 p-1.5 rounded-lg transition-colors shrink-0"
            >
              <IconX size={18} />
            </button>
          </div>

          <div
            className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3"
            ref={scrollRef}
          >
            {messages.length === 0 && (
              <div className="text-sm text-slate-600 space-y-3">
                <p className="font-medium text-slate-800">
                  Hola{user?.nombre ? ` ${user.nombre}` : ""}
                </p>
                <p className="text-xs leading-relaxed text-slate-500">
                  Preguntas frecuentes de <strong>{screenLabel}</strong>. Tocá una
                  (sin costo). Si escribís algo que no está en la lista, recién ahí
                  se puede consultar la IA.
                </p>
                <div className="grid gap-2">
                  {faqChips.map((faq) => (
                    <button
                      key={faq.id}
                      type="button"
                      onClick={() => handleChip(faq)}
                      className="text-xs text-left bg-white border border-slate-200 p-2.5 rounded-lg hover:bg-slate-100 hover:border-slate-300 transition-colors"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    m.role === "user"
                      ? "bg-slate-800 text-white rounded-br-none"
                      : "bg-white border border-slate-200 text-slate-700 rounded-bl-none"
                  }`}
                >
                  {m.role === "assistant" && m.source === "faq" && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 mb-1">
                      FAQ · sin tokens
                    </p>
                  )}
                  {m.role === "assistant" && m.source === "ai" && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 mb-1">
                      IA · usa tokens
                    </p>
                  )}
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 shadow-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                </div>
              </div>
            )}

            {messages.length > 0 && !loading && (
              <div className="pt-2 border-t border-slate-200/80">
                <p className="text-[10px] text-slate-400 mb-1.5">
                  Más de {screenLabel}
                </p>
                <div className="flex flex-col gap-1.5">
                  {faqChips.map((faq) => (
                    <button
                      key={`more-${faq.id}`}
                      type="button"
                      onClick={() => handleChip(faq)}
                      className="text-[11px] text-left px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:border-slate-400"
                    >
                      {faq.question}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
            <input
              className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition-all placeholder:text-slate-400"
              placeholder={`Pregunta sobre ${screenLabel}…`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSend()}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="bg-slate-800 text-white p-2.5 rounded-full hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95 flex items-center justify-center w-10 h-10"
            >
              {loading ? (
                <IconLoader className="animate-spin" size={18} />
              ) : (
                <IconSend size={18} className="ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`pointer-events-auto h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
          isOpen ? "bg-slate-600 text-slate-100" : "bg-slate-800 text-white"
        }`}
        title={`Ayuda: ${screenLabel}`}
      >
        {isOpen ? <IconX size={24} /> : <IconMessageSquare size={26} />}
      </button>
    </div>
  );
}
