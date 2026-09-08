"use client";

import { useCallback, useEffect, useRef, useState, type ElementType } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#%/<>*-";

type Props = {
  text: string;
  as?: ElementType;
  className?: string;
  /** "mount" roda uma vez ao entrar na viewport; "hover" roda a cada hover. */
  trigger?: "mount" | "hover";
  /** duração aproximada do embaralhamento em ms */
  duration?: number;
};

export function ScrambleText({
  text,
  as: Tag = "span",
  className,
  trigger = "mount",
  duration = 620,
}: Props) {
  const [display, setDisplay] = useState(text);
  const elRef = useRef<HTMLElement | null>(null);
  const frame = useRef<number>(0);
  const guard = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startedOnce = useRef(false);

  const run = useCallback(() => {
    cancelAnimationFrame(frame.current);
    clearTimeout(guard.current);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(text);
      return;
    }
    const settle = () => {
      cancelAnimationFrame(frame.current);
      clearTimeout(guard.current);
      setDisplay(text);
    };
    // Rede de segurança: o relógio (setTimeout) dispara mesmo com a aba em
    // segundo plano, quando o requestAnimationFrame fica congelado. Garante que
    // o título nunca fica preso em glifos.
    guard.current = setTimeout(settle, duration + 400);

    const started = Date.now();
    const tick = () => {
      const p = Math.min(1, (Date.now() - started) / duration);
      const revealed = Math.floor(p * text.length);
      let out = "";
      for (let i = 0; i < text.length; i++) {
        out +=
          text[i] === " "
            ? " "
            : i < revealed
              ? text[i]
              : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setDisplay(out);
      if (p < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        settle();
      }
    };
    frame.current = requestAnimationFrame(tick);
  }, [text, duration]);

  useEffect(() => {
    if (trigger !== "mount") return;
    const el = elRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !startedOnce.current) {
          startedOnce.current = true;
          run();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame.current);
      clearTimeout(guard.current);
    };
  }, [trigger, run]);

  return (
    <Tag
      ref={(node: HTMLElement | null) => {
        elRef.current = node;
      }}
      className={className}
      onMouseEnter={trigger === "hover" ? run : undefined}
      aria-label={text}
    >
      <span aria-hidden>{display}</span>
    </Tag>
  );
}
