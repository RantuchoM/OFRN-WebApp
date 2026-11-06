import {
  freshStartStatusBusy,
  freshStartStatusLabel,
  readFreshStartLog,
  runFreshStart,
} from "./freshStart.js";

const main = document.querySelector("main");
const doneEl = document.getElementById("done");
const msgEl = document.getElementById("msg");
const spinEl = document.getElementById("spin");

function paint(log) {
  const history = log.slice(0, -1);
  const current = log[log.length - 1] || "";
  const busy = freshStartStatusBusy(current);
  if (main) {
    main.dataset.busy = busy ? "true" : "false";
    main.dataset.phase = current;
  }
  if (spinEl) spinEl.hidden = !busy;
  if (doneEl) {
    const labels = history.map((code) => freshStartStatusLabel(code, "done"));
    const existing = [...doneEl.children];
    const samePrefix =
      existing.length <= labels.length &&
      existing.every((li, index) => li.textContent === labels[index]);
    if (!samePrefix) doneEl.replaceChildren();
    labels.slice(doneEl.children.length).forEach((text, offset) => {
      const li = document.createElement("li");
      li.className = "enter";
      li.style.animationDelay = `${offset * 50}ms`;
      li.textContent = text;
      doneEl.appendChild(li);
    });
    doneEl.hidden = labels.length === 0;
  }
  if (msgEl && current) msgEl.textContent = freshStartStatusLabel(current, "now");
}

const prior = readFreshStartLog(sessionStorage);
if (prior.length) paint(prior);

runFreshStart({
  serviceWorker: navigator.serviceWorker,
  cacheStorage: typeof caches !== "undefined" ? caches : null,
  sessionStorage,
  location,
  referrer: document.referrer,
  origin: location.origin,
  minStepMs: 900,
  closingMs: 550,
  onStatus(_code, log) {
    paint(log);
  },
}).catch(() => {
  if (main) {
    main.dataset.busy = "false";
    main.dataset.phase = "error";
  }
  if (spinEl) spinEl.hidden = true;
  if (msgEl) msgEl.textContent = freshStartStatusLabel("error", "now");
});
