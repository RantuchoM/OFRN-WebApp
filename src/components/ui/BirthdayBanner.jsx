import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useBirthdaysToday } from "../../hooks/useBirthdaysToday";
import { buildBirthdayMessage } from "../../utils/birthdayUtils";
import { IconX } from "./Icons";

const DISMISS_KEY = "ofrn:birthday-banner-dismissed";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function isDismissedToday() {
  try {
    return localStorage.getItem(DISMISS_KEY) === todayKey();
  } catch {
    return false;
  }
}

function dismissForToday() {
  try {
    localStorage.setItem(DISMISS_KEY, todayKey());
  } catch {
    /* ignore */
  }
}

export default function BirthdayBanner() {
  const { data: birthdays = [] } = useBirthdaysToday();
  const [dismissed, setDismissed] = useState(isDismissedToday);

  if (birthdays.length === 0 || dismissed) return null;

  const message = buildBirthdayMessage(birthdays);

  const handleDismiss = () => {
    dismissForToday();
    setDismissed(true);
  };

  return createPortal(
    <div
      className="fixed top-0 left-0 right-0 z-[45] flex justify-center px-3 pt-2 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto max-w-3xl w-full rounded-xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50 via-white to-indigo-50 px-3 py-2.5 shadow-lg shadow-indigo-100/60 animate-in fade-in slide-in-from-top-2 duration-300">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-sm font-bold text-indigo-900 leading-snug text-center pt-0.5">
            {message}
          </p>
          <button
            type="button"
            onClick={handleDismiss}
            className="shrink-0 rounded-xl border border-indigo-200 bg-white p-1.5 text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 hover:text-indigo-900 hover:shadow-md active:scale-95"
            aria-label="Cerrar aviso de cumpleaños"
            title="Cerrar aviso"
          >
            <IconX size={20} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
