import { useRef, useCallback, useState } from "react";

/**
 * Generic in-memory undo/redo stack (past / future).
 * @param {{ limit?: number, clone: (snapshot: unknown) => unknown, equals?: (a: unknown, b: unknown) => boolean }} options
 */
export function useUndoStack({
  limit = 50,
  clone,
  equals = (a, b) => JSON.stringify(a) === JSON.stringify(b),
}) {
  const historyRef = useRef({ past: [], future: [] });
  const skipRef = useRef(false);
  const [, bump] = useState(0);
  const notify = () => bump((n) => n + 1);

  const reset = useCallback(() => {
    historyRef.current = { past: [], future: [] };
    notify();
  }, []);

  const push = useCallback(
    (snapshot) => {
      if (skipRef.current) return;
      const hist = historyRef.current;
      const cloned = clone(snapshot);
      if (hist.past.length && equals(hist.past[hist.past.length - 1], cloned)) {
        return;
      }
      hist.past.push(cloned);
      while (hist.past.length > limit) {
        hist.past.shift();
      }
      hist.future = [];
      notify();
    },
    [clone, equals, limit],
  );

  const wrapSkip = useCallback(async (fn) => {
    skipRef.current = true;
    try {
      await fn();
    } finally {
      queueMicrotask(() => {
        skipRef.current = false;
      });
    }
  }, []);

  const undo = useCallback(
    async (getCurrent, applyPrevious) => {
      const hist = historyRef.current;
      if (!hist.past.length) return false;
      const previous = hist.past.pop();
      hist.future.push(clone(getCurrent()));
      while (hist.future.length > limit) {
        hist.future.shift();
      }
      await wrapSkip(() => applyPrevious(previous));
      notify();
      return true;
    },
    [clone, limit, wrapSkip],
  );

  const redo = useCallback(
    async (getCurrent, applyNext) => {
      const hist = historyRef.current;
      if (!hist.future.length) return false;
      const next = hist.future.pop();
      hist.past.push(clone(getCurrent()));
      while (hist.past.length > limit) {
        hist.past.shift();
      }
      await wrapSkip(() => applyNext(next));
      notify();
      return true;
    },
    [clone, limit, wrapSkip],
  );

  const hist = historyRef.current;
  return {
    push,
    undo,
    redo,
    reset,
    canUndo: hist.past.length > 0,
    canRedo: hist.future.length > 0,
  };
}
