"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Revela os filhos diretos com um leve deslize e stagger quando a seção
 * entra na viewport. Cada filho ganha `--i` (índice) para o atraso em CSS.
 * Respeita `prefers-reduced-motion` (via .lp-reveal em globals.css).
 */
export function Reveal({
  children,
  className,
  once = true,
}: {
  children: ReactNode;
  className?: string;
  once?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries[0]?.isIntersecting ?? false;
        if (hit) {
          setInView(true);
          if (once) io.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [once]);

  return (
    <div
      ref={ref}
      className={["lp-reveal", className].filter(Boolean).join(" ")}
      data-in={inView}
    >
      {Children.map(children, (child, i) =>
        isValidElement<{ style?: CSSProperties }>(child)
          ? cloneElement(child, {
              style: { ...(child.props.style ?? {}), "--i": i } as CSSProperties,
            })
          : child,
      )}
    </div>
  );
}
