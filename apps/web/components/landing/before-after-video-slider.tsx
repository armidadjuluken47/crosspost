"use client";

import { ChevronsLeftRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

type BeforeAfterVideoSliderProps = {
  beforeSrc: string;
  afterSrc: string;
  beforePoster?: string;
  afterPoster?: string;
  beforeLabel?: string;
  afterLabel?: string;
  topCaption?: string;
  bottomCaption?: string;
  className?: string;
};

function clampSplit(value: number) {
  return Math.min(100, Math.max(0, value));
}

export function BeforeAfterVideoSlider({
  beforeSrc,
  afterSrc,
  beforePoster,
  afterPoster,
  beforeLabel = "Before",
  afterLabel = "After",
  topCaption,
  bottomCaption,
  className = "",
}: BeforeAfterVideoSliderProps) {
  const [split, setSplit] = useState(52);
  const [shouldLoad, setShouldLoad] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);
  const draggingRef = useRef(false);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" },
    );

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldLoad) return;
    const before = beforeRef.current;
    const after = afterRef.current;
    if (!before || !after) return;

    const sync = () => {
      if (Math.abs(after.currentTime - before.currentTime) > 0.12) {
        before.currentTime = after.currentTime;
      }
    };

    after.addEventListener("timeupdate", sync);
    void after.play().catch(() => undefined);
    void before.play().catch(() => undefined);
    return () => after.removeEventListener("timeupdate", sync);
  }, [shouldLoad]);

  const updateSplitFromClientX = useCallback((clientX: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    if (rect.width <= 0) return;
    setSplit(clampSplit(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const endDrag = useCallback((event: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const onViewportPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      draggingRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      updateSplitFromClientX(event.clientX);
    },
    [updateSplitFromClientX],
  );

  const onViewportPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current) return;
      updateSplitFromClientX(event.clientX);
    },
    [updateSplitFromClientX],
  );

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setSplit((value) => clampSplit(value - 2));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setSplit((value) => clampSplit(value + 2));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSplit(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setSplit(100);
    }
  }, []);

  const sourceVideoWidth = split > 0 ? `${10000 / split}%` : "100%";

  return (
    <div className={`lp-compare ${className}`}>
      <div className="lp-hero-card">
        <div className="lp-compare-labels">
          <span>{beforeLabel}</span>
          <span className="lp-compare-label-after">{afterLabel}</span>
        </div>

        <div
          ref={viewportRef}
          className="lp-compare-viewport"
          style={{ "--split": split } as CSSProperties}
          role="slider"
          tabIndex={0}
          aria-label="Compare source clip and remixed result"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(split)}
          onPointerDown={onViewportPointerDown}
          onPointerMove={onViewportPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
        >
          <video
            ref={afterRef}
            src={shouldLoad ? afterSrc : undefined}
            poster={afterPoster}
            className="lp-compare-video lp-compare-video-after"
            autoPlay={shouldLoad}
            loop
            muted
            playsInline
            preload={shouldLoad ? "metadata" : "none"}
          />
          <div className="lp-compare-before-pane" style={{ width: `${split}%` }}>
            <video
              ref={beforeRef}
              src={shouldLoad ? beforeSrc : undefined}
              poster={beforePoster}
              className="lp-compare-video lp-compare-video-before"
              style={{ width: sourceVideoWidth }}
              autoPlay={shouldLoad}
              loop
              muted
              playsInline
              preload="none"
            />
          </div>

          {topCaption ? (
            <div className="lp-compare-caption lp-compare-caption-top">{topCaption}</div>
          ) : null}
          {bottomCaption ? (
            <div className="lp-compare-caption lp-compare-caption-bottom">{bottomCaption}</div>
          ) : null}

          <div className="lp-compare-handle" style={{ left: `${split}%` }}>
            <div className="lp-compare-line" aria-hidden />
            <div className="lp-compare-knob" aria-hidden>
              <ChevronsLeftRight className="h-4 w-4" strokeWidth={2.5} />
            </div>
          </div>
        </div>
      </div>
      <p className="lp-compare-hint">
        <span aria-hidden>↝</span> Drag to compare <span aria-hidden>↜</span>
      </p>
    </div>
  );
}
