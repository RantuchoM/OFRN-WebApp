import {
  FRESH_START_STATUS_TEXT,
  readFreshStartLog,
  runFreshStart,
} from "./freshStart.js";

const doneEl = document.getElementById("done");
const msgEl = document.getElementById("msg");

function paint(log) {
  const history = log.slice(0, -1);
  const current = log[log.length - 1];
  if (doneEl) {
    doneEl.replaceChildren();
    for (const code of history) {
      const li = document.createElement("li");
      li.textContent = FRESH_START_STATUS_TEXT[code] || code;
      doneEl.appendChild(li);
    }
    doneEl.hidden = history.length === 0;
  }
  if (msgEl) msgEl.textContent = FRESH_START_STATUS_TEXT[current] || "";
}

paint(readFreshStartLog(sessionStorage));

runFreshStart({
  serviceWorker: navigator.serviceWorker,
  cacheStorage: typeof caches !== "undefined" ? caches : null,
  sessionStorage,
  location,
  onStatus(_code, log) {
    paint(log);
  },
}).catch(() => {
  if (msgEl) msgEl.textContent = FRESH_START_STATUS_TEXT.error;
});
