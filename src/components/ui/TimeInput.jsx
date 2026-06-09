import React, { useState, useEffect } from 'react';
import TimeKeeper from 'react-timekeeper';
import { IconClock, IconX, IconCheck } from './Icons';

// Normaliza tiempos ingresados como "5:00" → "05:00" y valida rango 00:00–23:59
export const normalizeTime = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{1,2}):([0-5][0-9])$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
};

const sliceCommitted = (value) => (value ? String(value).slice(0, 5) : '');

const formatWhileTyping = (raw) => {
  let val = raw.replace(/[^0-9:]/g, '');
  if (val.length === 3 && !val.includes(':')) {
    val = `${val.slice(0, 2)}:${val.slice(2)}`;
  }
  if (val.length > 5) val = val.slice(0, 5);
  return val;
};

export default function TimeInput({ value, onChange, label, className }) {
  const [showClock, setShowClock] = useState(false);
  const committed = sliceCommitted(value);
  const [draft, setDraft] = useState(committed);
  const [focused, setFocused] = useState(false);
  const [tempTime, setTempTime] = useState(committed || '12:00');

  useEffect(() => {
    if (!focused) {
      const next = sliceCommitted(value);
      setDraft(next);
      setTempTime(next || '12:00');
    }
  }, [value, focused]);

  const commitIfValid = (val) => {
    const normalized = normalizeTime(val);
    if (normalized) {
      onChange(normalized);
      setDraft(normalized);
      return true;
    }
    return false;
  };

  const handleManualChange = (e) => {
    const val = formatWhileTyping(e.target.value);
    setDraft(val);
    commitIfValid(val);
  };

  const handleBlur = () => {
    setFocused(false);
    if (!commitIfValid(draft)) {
      setDraft(committed);
    }
  };

  const handleFocus = (e) => {
    setFocused(true);
    setDraft(committed);
    e.target.select?.();
  };

  const handleOpenClock = () => {
    const normalized = committed ? normalizeTime(committed) : null;
    setTempTime(normalized || '12:00');
    setShowClock(true);
  };

  const confirmClock = () => {
    const normalized = normalizeTime(tempTime) || tempTime;
    onChange(normalized);
    setDraft(sliceCommitted(normalized));
    setShowClock(false);
  };

  return (
    <div className="w-full">
      {label && (
        <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 block">
          {label}
        </label>
      )}

      <div className="relative group">
        <input
          type="text"
          value={draft}
          onChange={handleManualChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="--:--"
          maxLength={5}
          className={`w-full outline-none transition-colors text-center p-1 ${className || 'border border-slate-300 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-500'}`}
        />

        <button
          type="button"
          onClick={handleOpenClock}
          className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all opacity-0 group-hover:opacity-100 z-10"
          title="Abrir reloj"
        >
          <IconClock size={14} />
        </button>
      </div>

      {showClock && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="absolute inset-0" onClick={() => setShowClock(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-50 p-3 flex justify-between items-center border-b border-indigo-100">
              <span className="text-xs font-bold text-indigo-800 uppercase tracking-wide">
                Seleccionar Hora
              </span>
              <button
                type="button"
                onClick={() => setShowClock(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <IconX size={18} />
              </button>
            </div>
            <TimeKeeper
              time={tempTime}
              onChange={(t) => setTempTime(t.formatted24)}
              onDoneClick={confirmClock}
              switchToMinuteOnHourSelect
              hour24Mode
              doneButton={() => (
                <div
                  onClick={confirmClock}
                  className="bg-indigo-600 text-white text-center py-3.5 text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <IconCheck size={16} /> CONFIRMAR HORA
                </div>
              )}
            />
          </div>
        </div>
      )}
    </div>
  );
}
