import React from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { useAuth } from "../../context/AuthContext";
import { useFimbaUserSession } from "../../hooks/useFimbaUserSession";
import {
  clearFimbaUserSession,
  clearFimbaConsultaEdicionSession,
  FIMBA_ROLE_LABELS,
} from "../../utils/fimbaUserSession";
import { useFimbaConsultaEdicionSession } from "../../hooks/useFimbaConsultaEdicionSession";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import { IconLogOut } from "../../components/ui/Icons";
import FimbaSectionToggle, { parseFimbaSectionIds } from "./FimbaSectionToggle";

const FIMBA_CSS = `
  /* Tokens on root + portaled modals (createPortal → document.body leaves .fimba-root) */
  .fimba-root,
  .fimba-modal-backdrop {
    --fimba-accent: #d73289;
    --fimba-deep: #94216D;
    --fimba-cyan: #00b1eb;
    --fimba-cyan-2: #2AC4EA;
    --fimba-text: #222222;
    --fimba-muted: #5c5c5c;
    --fimba-surface: #ffffff;
    --fimba-bg: #f6f8fb;
    --fimba-border: #e2e8f0;
  }
  .fimba-root {
    min-height: 100vh;
    background:
      radial-gradient(1200px 500px at 10% -10%, rgba(215, 50, 137, 0.12), transparent 55%),
      radial-gradient(900px 420px at 100% 0%, rgba(0, 177, 235, 0.14), transparent 50%),
      var(--fimba-bg, #f6f8fb);
    color: var(--fimba-text, #222222);
    font-family: "DM Sans", "Rubik", "Open Sans", "Nunito Sans", system-ui, sans-serif;
  }
  .fimba-header {
    position: sticky;
    top: 0;
    z-index: 40;
    backdrop-filter: blur(10px);
    background: rgba(255, 255, 255, 0.86);
    border-bottom: 1px solid var(--fimba-border);
  }
  .fimba-header-inner {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0.85rem 1.25rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
  .fimba-brand {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    text-decoration: none;
    color: inherit;
  }
  .fimba-logo {
    font-weight: 800;
    letter-spacing: 0.04em;
    font-size: 1.35rem;
    color: var(--fimba-deep);
    line-height: 1;
  }
  .fimba-logo em {
    font-style: normal;
    color: var(--fimba-cyan);
  }
  .fimba-brand-sub {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--fimba-muted);
    font-weight: 600;
  }
  .fimba-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-wrap: wrap;
    justify-content: flex-end;
    min-width: 0;
  }
  /* Segmented control: Agenda | Transportes | Hotelería */
  .fimba-section-toggle {
    display: inline-flex;
    align-items: stretch;
    padding: 3px;
    border-radius: 10px;
    border: 1px solid var(--fimba-border);
    background: #f1f5f9;
    gap: 2px;
    max-width: 100%;
  }
  .fimba-section-toggle-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border-radius: 8px;
    font-size: 0.78rem;
    font-weight: 700;
    text-decoration: none;
    color: var(--fimba-muted);
    white-space: nowrap;
    transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
  }
  .fimba-section-toggle-item:hover {
    color: var(--fimba-deep);
    background: rgba(255, 255, 255, 0.7);
  }
  .fimba-section-toggle-item.is-active {
    background: #d73289;
    background: var(--fimba-accent, #d73289);
    color: #ffffff;
    box-shadow: 0 1px 3px rgba(215, 50, 137, 0.35);
  }
  .fimba-section-toggle-item.is-active:hover {
    background: #94216d;
    background: var(--fimba-deep, #94216d);
    color: #ffffff;
  }
  @media (max-width: 720px) {
    .fimba-section-toggle-label { display: none; }
    .fimba-section-toggle-item { padding: 0.42rem 0.55rem; }
  }
  .fimba-main {
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.5rem 1.25rem 3rem;
    /* Allow wide planillas to own their scroll; do not clip children */
    overflow-x: visible;
  }
  .fimba-main:has(.fimba-agenda-wide),
  .fimba-main:has(.fimba-hotel-wide),
  .fimba-main:has(.fimba-edicion-wide),
  .fimba-main:has(.fimba-venues-wide) {
    max-width: 1200px;
  }
  /* Transportes: full-bleed within viewport so the planilla can scroll horizontally */
  .fimba-main:has(.fimba-transport-wide) {
    max-width: none;
    width: 100%;
    box-sizing: border-box;
  }
  .fimba-transport-wide {
    min-width: 0;
    max-width: 100%;
  }
  /* Planilla trayectos: horizontal scroll that actually works */
  .fimba-planilla-card {
    padding: 0;
    overflow: visible;
    min-width: 0;
  }
  .fimba-planilla-scroll {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-x: contain;
    max-width: 100%;
  }
  .fimba-planilla-table {
    width: max-content;
    min-width: 100%;
    table-layout: auto;
    border-collapse: separate;
    border-spacing: 0;
  }
  .fimba-planilla-table th,
  .fimba-planilla-table td {
    white-space: nowrap;
  }
  .fimba-planilla-table .fimba-planilla-wrap {
    white-space: normal;
    max-width: 11rem;
  }
  .fimba-planilla-table .fimba-planilla-board-th-up {
    color: #166534;
    background: #f0fdf4 !important;
  }
  .fimba-planilla-table .fimba-planilla-board-th-down {
    color: #9f1239;
    background: #fff1f2 !important;
  }
  .fimba-planilla-table td.fimba-planilla-board {
    white-space: normal;
    min-width: 8.5rem;
    max-width: 14rem;
    vertical-align: top;
  }
  .fimba-planilla-transito {
    position: relative;
    white-space: nowrap;
  }
  .fimba-transito-tooltip {
    position: fixed;
    z-index: 110;
    min-width: 11rem;
    max-width: 18rem;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    background: #1e293b;
    color: #f8fafc;
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.35);
    pointer-events: none;
    font-size: 0.72rem;
    line-height: 1.35;
  }
  .fimba-transito-tooltip-title {
    font-weight: 700;
    margin-bottom: 0.35rem;
    color: #e2e8f0;
  }
  .fimba-transito-tooltip-empty {
    color: #94a3b8;
    font-style: italic;
  }
  .fimba-transito-tooltip-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .fimba-transito-tooltip-list li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .fimba-transito-tooltip-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .fimba-transito-tooltip-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .fimba-transito-tooltip-n {
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .fimba-transito-tooltip-foot {
    margin-top: 0.4rem;
    padding-top: 0.3rem;
    border-top: 1px solid rgba(148, 163, 184, 0.35);
    color: #94a3b8;
    font-size: 0.68rem;
  }
  .fimba-planilla-board-cell {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;
    width: 100%;
    min-width: 7.5rem;
    padding: 0.35rem 0.4rem;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    text-align: left;
  }
  .fimba-planilla-board-head {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-size: 0.72rem;
    font-weight: 800;
  }
  .fimba-planilla-board-add {
    display: inline-flex;
    opacity: 0.55;
    margin-left: 0.1rem;
  }
  .fimba-planilla-board-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    justify-content: center;
  }
  .fimba-planilla-board-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
    max-width: 100%;
    padding: 0.1rem 0.35rem;
    border-radius: 999px;
    border: 1px solid #e2e8f0;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.2;
  }
  .fimba-planilla-board-chip.fimba-planilla-board-chip-ofrn {
    border-radius: 2px;
  }
  /* Truncación de nombre + «… n» en JS (`formatBoardChipLabel`); no ellipsis CSS. */
  .fimba-planilla-board-chip-label {
    white-space: nowrap;
    max-width: 11rem;
  }
  .fimba-planilla-board-chip-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    cursor: pointer;
    color: inherit;
    opacity: 0.55;
    flex-shrink: 0;
  }
  .fimba-planilla-board-chip-x:hover:not(:disabled) {
    opacity: 1;
    color: #b91c1c;
  }
  .fimba-planilla-board-chip-x:disabled {
    cursor: wait;
    opacity: 0.35;
  }
  .fimba-planilla-board-empty {
    display: block;
    text-align: center;
    font-size: 0.68rem;
    font-weight: 600;
  }
  .fimba-planilla-table thead th {
    position: sticky;
    top: 0;
    z-index: 5;
    background: #fff;
  }
  /* Sticky context while scrolling right: Origen | Fecha | Com·Fin */
  .fimba-planilla-table .fimba-sticky-origen {
    position: sticky;
    left: 0;
    z-index: 3;
    min-width: 6.75rem;
    width: 6.75rem;
    padding-left: 1rem !important;
    background: #fff;
  }
  .fimba-planilla-table .fimba-sticky-fecha {
    position: sticky;
    left: 6.75rem;
    z-index: 3;
    min-width: 5.25rem;
    width: 5.25rem;
    background: #fff;
  }
  .fimba-planilla-table .fimba-sticky-hora {
    position: sticky;
    left: 12rem;
    z-index: 3;
    min-width: 5.5rem;
    width: 5.5rem;
    background: #fff;
    box-shadow: 3px 0 6px -3px rgba(15, 23, 42, 0.12);
  }
  .fimba-planilla-table thead .fimba-sticky-origen,
  .fimba-planilla-table thead .fimba-sticky-fecha,
  .fimba-planilla-table thead .fimba-sticky-hora {
    z-index: 6;
    background: #fff;
  }
  .fimba-planilla-table .fimba-row-ofrn .fimba-sticky-origen,
  .fimba-planilla-table .fimba-row-ofrn .fimba-sticky-fecha,
  .fimba-planilla-table .fimba-row-ofrn .fimba-sticky-hora {
    background: #f3fafd;
  }
  .fimba-planilla-table .fimba-row-ambos .fimba-sticky-origen,
  .fimba-planilla-table .fimba-row-ambos .fimba-sticky-fecha,
  .fimba-planilla-table .fimba-row-ambos .fimba-sticky-hora {
    background: #fdf7fb;
  }
  /* Modo edición: semáforo sticky + inputs de fecha/hora más anchos */
  .fimba-planilla-table.fimba-table-edit .fimba-sticky-sync {
    position: sticky;
    left: 0;
    z-index: 4;
    width: 2rem;
    min-width: 2rem;
    padding-left: 0.45rem !important;
    padding-right: 0.15rem !important;
    background: #fff;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-sticky-origen {
    left: 2rem;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-sticky-fecha {
    left: 8.75rem;
    min-width: 8.25rem;
    width: 8.25rem;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-sticky-hora {
    left: 17rem;
    min-width: 7.25rem;
    width: 7.25rem;
  }
  .fimba-planilla-table.fimba-table-edit thead .fimba-sticky-sync,
  .fimba-planilla-table.fimba-table-edit thead .fimba-sticky-origen,
  .fimba-planilla-table.fimba-table-edit thead .fimba-sticky-fecha,
  .fimba-planilla-table.fimba-table-edit thead .fimba-sticky-hora {
    z-index: 6;
    background: #fff;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-row-ofrn .fimba-sticky-sync,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ofrn .fimba-sticky-origen,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ofrn .fimba-sticky-fecha,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ofrn .fimba-sticky-hora {
    background: #f3fafd;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-row-ambos .fimba-sticky-sync,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ambos .fimba-sticky-origen,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ambos .fimba-sticky-fecha,
  .fimba-planilla-table.fimba-table-edit .fimba-row-ambos .fimba-sticky-hora {
    background: #fdf7fb;
  }
  .fimba-hora-edit {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 6.5rem;
  }
  .fimba-hora-edit .fimba-cell-input {
    min-width: 0;
    width: 100%;
    padding: 0.15rem 0.25rem;
    font-size: 0.78rem;
  }
  .fimba-planilla-table.fimba-table-edit .fimba-planilla-wrap .fimba-cell-input {
    min-width: 7.5rem;
  }
  .fimba-planilla-table .fimba-planilla-actions {
    text-align: right;
    padding-right: 0.75rem !important;
    white-space: nowrap;
  }
  .fimba-card {
    background: var(--fimba-surface);
    border: 1px solid var(--fimba-border);
    border-radius: 12px;
    padding: 1.1rem 1.25rem;
  }
  .fimba-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.5rem 0.9rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    color: var(--fimba-text, #222222);
    background: #ffffff;
    border-color: var(--fimba-border, #e2e8f0);
  }
  .fimba-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  /* Explicit hex fallbacks: portaled modals must not bleach to white-on-white */
  .fimba-btn-primary {
    background: #d73289;
    background: var(--fimba-accent, #d73289);
    color: #ffffff;
    border-color: #d73289;
    border-color: var(--fimba-accent, #d73289);
  }
  .fimba-btn-primary:hover:not(:disabled) {
    background: #94216d;
    background: var(--fimba-deep, #94216d);
    border-color: #94216d;
    border-color: var(--fimba-deep, #94216d);
    color: #ffffff;
  }
  .fimba-btn-ghost {
    background: #ffffff;
    border-color: var(--fimba-border, #e2e8f0);
    color: var(--fimba-text, #222222);
  }
  .fimba-btn-ghost:hover:not(:disabled) {
    border-color: var(--fimba-cyan, #00b1eb);
    color: var(--fimba-deep, #94216d);
  }
  .fimba-btn-danger {
    background: #ffffff;
    border-color: #fecaca;
    color: #b91c1c;
  }
  /* Segment / filter chips (Audiencia OFRN, day filters, etc.) */
  .fimba-chip {
    background: #ffffff;
    color: #222222;
    border-color: #e2e8f0;
  }
  .fimba-chip-on {
    background: #94216d;
    color: #ffffff;
    border-color: #94216d;
  }
  .fimba-chip-on:hover:not(:disabled) {
    background: #7a1b5a;
    border-color: #7a1b5a;
    color: #ffffff;
  }
  .fimba-input, .fimba-select, .fimba-textarea {
    width: 100%;
    border: 1px solid var(--fimba-border);
    border-radius: 8px;
    padding: 0.5rem 0.7rem;
    font-size: 0.9rem;
    background: #fff;
    color: var(--fimba-text);
  }
  .fimba-input:focus, .fimba-select:focus, .fimba-textarea:focus {
    outline: 2px solid rgba(0, 177, 235, 0.35);
    border-color: var(--fimba-cyan);
  }
  .fimba-richtext {
    background: #fff;
    border: 1px solid var(--fimba-border);
    border-radius: 8px;
    /* visible: snow link tooltip is position:absolute inside .ql-container;
       overflow:hidden clipped it when Quill set left < 0 (looked stuck left). */
    overflow: visible;
  }
  .fimba-richtext .ql-toolbar.ql-snow {
    border: 0;
    border-bottom: 1px solid var(--fimba-border);
    border-radius: 8px 8px 0 0;
    background: #fdf2f8;
    font-family: inherit;
  }
  .fimba-richtext .ql-container.ql-snow {
    border: 0;
    border-radius: 0 0 8px 8px;
    font-family: inherit;
    font-size: 0.9rem;
    min-height: 140px;
    overflow: visible;
  }
  .fimba-richtext .ql-tooltip {
    z-index: 40;
  }
  .fimba-richtext .ql-editor {
    min-height: 140px;
    color: var(--fimba-text);
  }
  .fimba-richtext .ql-editor img,
  .fimba-rider-html img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 0.55em 0;
    border-radius: 6px;
  }
  .fimba-richtext .ql-editor.ql-blank::before {
    color: #94a3b8;
    font-style: normal;
  }
  .fimba-richtext .ql-snow .ql-stroke {
    stroke: #94216d;
  }
  .fimba-richtext .ql-snow .ql-fill {
    fill: #94216d;
  }
  .fimba-richtext .ql-snow .ql-picker {
    color: #94216d;
  }
  .fimba-richtext .ql-toolbar.ql-snow .ql-picker-label:hover,
  .fimba-richtext .ql-toolbar.ql-snow button:hover,
  .fimba-richtext .ql-toolbar.ql-snow button.ql-active {
    color: #d73289;
  }
  .fimba-richtext .ql-toolbar.ql-snow button:hover .ql-stroke,
  .fimba-richtext .ql-toolbar.ql-snow button.ql-active .ql-stroke {
    stroke: #d73289;
  }
  .fimba-rider-html {
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--fimba-text);
  }
  .fimba-rider-html p { margin: 0.4em 0; }
  .fimba-rider-html ul, .fimba-rider-html ol { margin: 0.4em 0 0.6em 1.25em; padding: 0; }
  .fimba-rider-html li { margin-bottom: 0.15em; }
  .fimba-rider-html h1, .fimba-rider-html h2, .fimba-rider-html h3 {
    margin: 0.55em 0 0.25em;
    color: var(--fimba-deep);
    font-weight: 700;
  }
  .fimba-rider-html h1 { font-size: 1.15rem; }
  .fimba-rider-html h2 { font-size: 1.05rem; }
  .fimba-rider-html h3 { font-size: 0.95rem; }
  .fimba-rider-html a { color: var(--fimba-cyan); }
  .fimba-rider-html blockquote {
    margin: 0.5em 0;
    padding: 0.35em 0.75em;
    border-left: 3px solid var(--fimba-accent);
    color: var(--fimba-muted);
    background: #f8fafc;
  }
  .fimba-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fimba-muted);
    margin-bottom: 0.3rem;
  }
  .fimba-field { margin-bottom: 0.85rem; }
  .fimba-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  .fimba-table th {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--fimba-muted);
    padding: 0.55rem 0.4rem;
    border-bottom: 1px solid var(--fimba-border);
  }
  .fimba-table td {
    padding: 0.65rem 0.4rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: middle;
  }
  .fimba-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border-radius: 999px;
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 700;
    background: #f1f5f9;
    color: var(--fimba-muted);
  }
  .fimba-badge-fimba {
    background: rgba(215, 50, 137, 0.12);
    color: var(--fimba-deep);
    border: 1px solid rgba(215, 50, 137, 0.28);
  }
  .fimba-badge-ofrn {
    background: rgba(0, 177, 235, 0.12);
    color: #0369a1;
    border: 1px solid rgba(0, 177, 235, 0.35);
  }
  /* OFRN orquesta grupos / Tutti: square vs FIMBA artist pills */
  .fimba-badge-ofrn-grupo,
  .fimba-btn.fimba-chip-ofrn,
  .fimba-planilla-board-chip-ofrn {
    border-radius: 2px;
  }
  .fimba-row-ofrn td {
    background: rgba(0, 177, 235, 0.04);
  }
  .fimba-row-ofrn td:first-child {
    box-shadow: inset 3px 0 0 var(--fimba-cyan);
  }
  .fimba-row-ambos td {
    background: rgba(215, 50, 137, 0.03);
  }
  .fimba-row-ambos td:first-child {
    box-shadow: inset 3px 0 0 var(--fimba-deep);
  }
  .fimba-badge-early {
    background: #e0f2fe;
    color: #0369a1;
  }
  .fimba-badge-late {
    background: #fef3c7;
    color: #b45309;
  }
  .fimba-flag-check {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--fimba-muted);
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
  }
  .fimba-flag-check input {
    margin: 0;
    accent-color: var(--fimba-accent);
  }
  .fimba-date-flag-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }
  .fimba-date-flag-read {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .fimba-swatch {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 999px;
    flex-shrink: 0;
  }
  .fimba-muted { color: var(--fimba-muted); }
  .fimba-error {
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    padding: 0.65rem 0.85rem;
    font-size: 0.875rem;
  }
  .fimba-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(15, 23, 42, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }
  .fimba-modal {
    background: #fff;
    border-radius: 14px;
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow: auto;
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.2);
    padding: 1.25rem 1.35rem;
    color: #222222;
    color: var(--fimba-text, #222222);
  }
  .fimba-modal h2 {
    margin: 0 0 1rem;
    font-size: 1.15rem;
    color: #94216d;
    color: var(--fimba-deep, #94216d);
  }
  .fimba-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }
  @media (max-width: 640px) {
    .fimba-grid-2 { grid-template-columns: 1fr; }
  }
  /* Planilla artistas — modo edición + semáforo (tipo MealsManager) */
  .fimba-artistas-table {
    width: 100%;
    table-layout: auto;
  }
  .fimba-artistas-table th,
  .fimba-artistas-table td {
    white-space: nowrap;
  }
  .fimba-artistas-table th,
  .fimba-artistas-table td {
    padding-left: 0.3rem;
    padding-right: 0.3rem;
  }
  .fimba-table-edit td {
    padding: 0.35rem 0.25rem;
  }
  .fimba-col-artista {
    min-width: 9rem;
    max-width: 14rem;
  }
  .fimba-col-num {
    width: 3.25rem;
    text-align: center;
  }
  .fimba-col-date {
    width: 7.5rem;
  }
  .fimba-col-hotel {
    min-width: 6.5rem;
    max-width: 10rem;
  }
  .fimba-col-obs {
    min-width: 8rem;
    max-width: 14rem;
  }
  .fimba-cell-obs {
    resize: vertical;
    min-height: 2.4rem;
    line-height: 1.25;
  }
  .fimba-col-actions {
    width: 1%;
    text-align: right;
    padding-right: 0.55rem !important;
    white-space: nowrap;
  }
  .fimba-artista-cell {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
  }
  .fimba-artista-cell .fimba-cell-input {
    flex: 1;
    min-width: 0;
  }
  .fimba-cell-input {
    width: 100%;
    min-width: 0;
    border: 1px solid var(--fimba-border);
    border-radius: 6px;
    padding: 0.3rem 0.35rem;
    font-size: 0.82rem;
    background: #fff;
    color: var(--fimba-text);
    font-family: inherit;
  }
  .fimba-cell-input:focus {
    outline: 2px solid rgba(0, 177, 235, 0.4);
    border-color: var(--fimba-cyan);
  }
  .fimba-cell-num {
    width: 3.5rem;
    text-align: right;
  }
  .fimba-cell-date {
    min-width: 8.75rem;
    width: 8.75rem;
  }
  .fimba-date-inherit {
    font-size: 0.65rem;
    line-height: 1.2;
    margin-top: 2px;
  }
  .fimba-sync-col {
    width: 28px;
    padding-left: 0.5rem !important;
    padding-right: 0.15rem !important;
    vertical-align: middle;
  }
  .fimba-expand-col {
    width: 34px;
    padding-left: 0.35rem !important;
    padding-right: 0 !important;
    vertical-align: middle;
  }
  .fimba-expand-btn {
    padding: 0.2rem !important;
    min-width: 28px;
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
    flex-shrink: 0;
  }
  .fimba-expand-btn svg {
    pointer-events: none;
  }
  .fimba-artista-name-btn {
    display: inline;
    font-weight: 600;
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
    color: inherit;
    font: inherit;
    text-align: left;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .fimba-artista-name-btn:hover {
    color: var(--fimba-deep);
  }
  .fimba-nomina-row td {
    white-space: normal !important;
  }
  .fimba-nomina-cell {
    padding: 0 !important;
    white-space: normal !important;
    background: #f1f5f9;
    border-bottom: 1px solid var(--fimba-border);
  }
  .fimba-nomina-panel {
    padding: 0.65rem 1rem 0.85rem 2.25rem;
    min-height: 2.5rem;
  }
  .fimba-nomina-subheader {
    font-size: 0.8rem;
    color: var(--fimba-muted);
    margin-bottom: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
  }
  .fimba-nomina-subheader strong {
    color: var(--fimba-deep);
  }
  .fimba-nomina-link {
    color: var(--fimba-cyan);
    font-weight: 600;
    text-decoration: none;
  }
  .fimba-nomina-link:hover {
    text-decoration: underline;
  }
  .fimba-nomina-table {
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
  }
  .fimba-nomina-table th,
  .fimba-nomina-table td {
    white-space: nowrap;
  }
  .fimba-sync-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #34d399;
    opacity: 0.85;
  }
  .fimba-sync-idle .fimba-sync-dot,
  .fimba-sync-dot.fimba-sync-idle { background: #34d399; opacity: 0.7; }
  .fimba-sync-pending .fimba-sync-dot,
  .fimba-sync-dot.fimba-sync-pending { background: #fbbf24; }
  .fimba-sync-saving .fimba-sync-dot,
  .fimba-sync-dot.fimba-sync-saving {
    background: #f59e0b;
    animation: fimba-pulse 0.9s ease-in-out infinite;
  }
  .fimba-sync-saved .fimba-sync-dot,
  .fimba-sync-dot.fimba-sync-saved {
    background: #10b981;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.7);
  }
  .fimba-sync-error .fimba-sync-dot,
  .fimba-sync-dot.fimba-sync-error { background: #ef4444; }
  .fimba-sync-icon {
    display: none;
  }
  .fimba-sync-legend {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .fimba-sync-legend .fimba-sync-dot {
    width: 8px;
    height: 8px;
  }
  .fimba-row-dirty { background: rgba(251, 191, 36, 0.08); }
  .fimba-row-saving { background: rgba(245, 158, 11, 0.1); }
  .fimba-row-saved { background: rgba(16, 185, 129, 0.1); transition: background 0.7s ease; }
  .fimba-row-error { background: rgba(239, 68, 68, 0.08); }
  .fimba-row-error-msg td,
  .fimba-cell-error-msg {
    color: #b91c1c;
    font-size: 0.75rem;
    padding: 0.2rem 1rem 0.45rem !important;
    white-space: normal !important;
    border-bottom-color: #fecaca;
    background: #fef2f2;
  }
  @keyframes fimba-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.45; }
  }
`;

export default function FimbaLayout({ mode = "staff", subtitle, children }) {
  useDocumentTitle({
    pathname: "/fimba",
    staticTitle: "FIMBA · Festival",
    enabled: true,
  });
  const location = useLocation();
  const navigate = useNavigate();
  const { edicionId: paramEdicionId } = useParams();
  const { user, isManagement } = useAuth();
  const fimbaUser = useFimbaUserSession();
  const consultaToken = useFimbaConsultaEdicionSession();
  // Default context when Layout is used outside FimbaAccessProvider (token/login)
  const access = useFimbaAccess();

  const isToken = mode === "token";
  const { edicionId: pathEdicionId } = parseFimbaSectionIds(location.pathname);
  const showSectionToggle = !isToken && Boolean(paramEdicionId || pathEdicionId);
  const isOfrnStaff = Boolean(user && isManagement);
  const showFimbaSession =
    !isToken && Boolean(fimbaUser) && !isOfrnStaff;
  const showTokenConsultaSession =
    !isToken &&
    !isOfrnStaff &&
    !fimbaUser &&
    Boolean(consultaToken) &&
    access.source === "token_consulta";

  const handleFimbaLogout = () => {
    clearFimbaUserSession();
    clearFimbaConsultaEdicionSession();
    navigate("/fimba/login", { replace: true });
  };

  const sessionLabel = fimbaUser
    ? fimbaUser.nombre || fimbaUser.mail
    : showTokenConsultaSession
      ? "Consulta (enlace)"
      : null;

  const brandEdicionId =
    fimbaUser?.id_edicion ||
    consultaToken?.id_edicion ||
    pathEdicionId ||
    paramEdicionId;
  const brandHref = isToken
    ? location.pathname
    : (showFimbaSession || showTokenConsultaSession) && brandEdicionId
      ? `/fimba/edicion/${brandEdicionId}`
      : "/fimba";

  const brandSub =
    subtitle ||
    (isToken
      ? "Festival"
      : access.readOnly && !isOfrnStaff
        ? "Consulta"
        : showFimbaSession
          ? FIMBA_ROLE_LABELS[fimbaUser?.rol_fimba] || "Edición"
          : "Staff");

  return (
    <div className="fimba-root">
      <style>{FIMBA_CSS}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&family=Rubik:wght@400;600;700&display=swap"
      />
      <header className="fimba-header">
        <div className="fimba-header-inner">
          <Link to={brandHref} className="fimba-brand">
            <span className="fimba-logo">
              FI<em>M</em>BA
            </span>
            <span className="fimba-brand-sub">{brandSub}</span>
          </Link>
          <div className="fimba-header-actions">
            {showSectionToggle && <FimbaSectionToggle />}
            {(showFimbaSession || showTokenConsultaSession) && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <span
                  className="fimba-muted"
                  style={{ fontSize: "0.78rem", fontWeight: 600, maxWidth: 180 }}
                  title={fimbaUser?.mail || "Enlace de consulta"}
                >
                  {sessionLabel}
                </span>
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={handleFimbaLogout}
                >
                  <IconLogOut size={14} /> Salir
                </button>
              </div>
            )}
            {!isToken && isOfrnStaff && (
              <Link to="/" className="fimba-btn fimba-btn-ghost">
                Volver a OFRN
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="fimba-main">{children ?? <Outlet />}</main>
    </div>
  );
}
