import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import GlassCrackSprite from "./GlassCrackSprite";
import { GLASS_CRACK_PATTERNS, GLASS_PATTERN_COUNT } from "./glassPatterns";

const OVERLAY_ID = "desktop-destroyer-easter-egg";

function getViewportMetrics() {
  const vv = window.visualViewport;
  return {
    width: Math.round(vv?.width ?? window.innerWidth),
    height: Math.round(vv?.height ?? window.innerHeight),
    offsetLeft: vv?.offsetLeft ?? 0,
    offsetTop: vv?.offsetTop ?? 0,
  };
}

export default function DesktopDestroyerEasterEgg({ enabled }) {
  const [active, setActive] = useState(false);
  const [viewport, setViewport] = useState(getViewportMetrics);
  const [impacts, setImpacts] = useState([]);
  const activeRef = useRef(false);
  const patternIndexRef = useRef(0);

  const close = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    setImpacts([]);
    patternIndexRef.current = 0;
  }, []);

  const open = useCallback(() => {
    setViewport(getViewportMetrics());
    activeRef.current = true;
    setActive(true);
  }, []);

  const toggle = useCallback(() => {
    if (activeRef.current) close();
    else open();
  }, [close, open]);

  const addImpact = useCallback((x, y) => {
    if (x < 0 || y < 0) return;

    const patternDef = GLASS_CRACK_PATTERNS[patternIndexRef.current % GLASS_PATTERN_COUNT];
    patternIndexRef.current += 1;

    const scale = 0.88 + Math.random() * 0.18;
    const rotation = Math.random() * 360;

    setImpacts((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        x,
        y,
        src: patternDef.src,
        rotation,
        size: Math.round(patternDef.size * scale),
      },
    ]);
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      const frame = e.currentTarget;
      const rect = frame.getBoundingClientRect();
      addImpact(e.clientX - rect.left, e.clientY - rect.top);
    },
    [addImpact],
  );

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        toggle();
        return;
      }
      if (e.key === "Escape" && activeRef.current) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, toggle, close]);

  useEffect(() => {
    if (!active) return undefined;

    GLASS_CRACK_PATTERNS.forEach((p) => {
      const img = new Image();
      img.src = p.src;
    });
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;

    const onViewportChange = () => setViewport(getViewportMetrics());

    window.visualViewport?.addEventListener("resize", onViewportChange);
    window.visualViewport?.addEventListener("scroll", onViewportChange);
    window.addEventListener("resize", onViewportChange);

    return () => {
      window.visualViewport?.removeEventListener("resize", onViewportChange);
      window.visualViewport?.removeEventListener("scroll", onViewportChange);
      window.removeEventListener("resize", onViewportChange);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const blockScroll = (e) => e.preventDefault();
    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
    };
  }, [active]);

  if (!enabled || !active) return null;

  const frameStyle = {
    width: `${viewport.width}px`,
    height: `${viewport.height}px`,
    marginLeft: `${viewport.offsetLeft}px`,
    marginTop: `${viewport.offsetTop}px`,
  };

  const overlay = (
    <div
      id={OVERLAY_ID}
      className="fixed inset-0 z-[9999] touch-none select-none overflow-hidden"
      role="presentation"
      aria-hidden
    >
      <div id={`${OVERLAY_ID}-frame`} className="absolute" style={frameStyle}>
        <div
          className="absolute inset-0 cursor-pointer"
          onPointerDown={handlePointerDown}
          aria-hidden
        >
          {impacts.map((impact) => (
            <div
              key={impact.id}
              className="pointer-events-none absolute"
              style={{
                left: impact.x,
                top: impact.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                style={{
                  transform: `rotate(${impact.rotation}deg)`,
                  transformOrigin: "center center",
                }}
              >
                <GlassCrackSprite src={impact.src} size={impact.size} />
              </div>
            </div>
          ))}
        </div>
        <div className="pointer-events-none absolute bottom-4 left-0 right-0 flex justify-center">
          <p className="rounded-full bg-black/55 px-4 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur-sm shadow-lg">
            Clic para grietas · Esc para volver a la app
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
