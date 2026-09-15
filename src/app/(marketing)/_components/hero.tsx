"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightIcon } from "lucide-react";

import { HERO_MOCKS } from "./hero-card-mocks";
import { ScrambleText } from "./scramble-text";

const N = HERO_MOCKS.length;
const FOCAL = 4;

type Pose = {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  s: number;
};

const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

function clusterPose(i: number, u: number): Pose {
  if (i === FOCAL) {
    return { x: u * 0.04, y: -u * 0.05, z: u * 0.95, rx: -4, ry: 6, rz: -1, s: 1.32 };
  }
  const r = (n: number) => rand(i * 9.17 + n);
  return {
    x: (r(1) * 2 - 1) * u * 1.85,
    y: (r(2) * 2 - 1) * u * 1.12,
    z: (r(3) * 2 - 1) * u * 2.3,
    rx: (r(4) * 2 - 1) * 15,
    ry: (r(5) * 2 - 1) * 24,
    rz: (r(6) * 2 - 1) * 7,
    s: 0.86 + r(7) * 0.4,
  };
}

function helixPose(i: number, u: number): Pose {
  const a = (i / N) * Math.PI * 2 * 1.5;
  const R = u * 1.45;
  return {
    x: Math.sin(a) * R,
    y: (i / (N - 1) - 0.5) * u * 2.9,
    z: Math.cos(a) * R - u * 0.25,
    rx: 0,
    ry: -(a * 180) / Math.PI,
    rz: 0,
    s: 1,
  };
}

function gridPose(i: number, u: number): Pose {
  const col = i % 3;
  const row = Math.floor(i / 3);
  return {
    x: (col - 1) * u * 1.24,
    y: (row - 1) * u * 0.92,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    s: 1,
  };
}

function blend(a: Pose, b: Pose, t: number): Pose {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    s: lerp(a.s, b.s, t),
  };
}

function poseAt(i: number, u: number, p: number): Pose {
  const k0 = clusterPose(i, u);
  const k1 = helixPose(i, u);
  const k2 = gridPose(i, u);
  if (p <= 0.5) return blend(k0, k1, easeInOut(p / 0.5));
  return blend(k1, k2, easeInOut((p - 0.5) / 0.5));
}

const unit = (vw: number) => clamp(vw * 0.2, 148, 264);

function poseToTransform(pose: Pose) {
  return `translate(-50%, -50%) translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(
    2,
  )}px, ${pose.z.toFixed(2)}px) rotateX(${pose.rx.toFixed(2)}deg) rotateY(${pose.ry.toFixed(
    2,
  )}deg) rotateZ(${pose.rz.toFixed(2)}deg) scale(${pose.s.toFixed(3)})`;
}

export function Hero() {
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [reduced, setReduced] = useState(false);

  const initial = useMemo(() => {
    const u = 210;
    return HERO_MOCKS.map((_, i) => poseToTransform(poseAt(i, u, 0)));
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const inner = innerRef.current;
    if (!track || !inner) return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    let running = true;
    let raf = 0;
    let mx = 0;
    let my = 0;
    let cx = 0;
    let cy = 0;

    const io = new IntersectionObserver(
      (entries) => {
        running = entries[0]?.isIntersecting ?? false;
        if (running && !raf) raf = requestAnimationFrame(frameLoop);
      },
      { threshold: 0 },
    );
    io.observe(track);

    const onPointer = (e: PointerEvent) => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (finePointer && !reduced) {
      window.addEventListener("pointermove", onPointer, { passive: true });
    }

    function progress() {
      if (reduced) return 1;
      const rect = track!.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return 0;
      return clamp(-rect.top / total, 0, 1);
    }

    function frameLoop(now: number) {
      raf = 0;
      if (!running) return;
      const p = progress();
      const u = unit(window.innerWidth);
      const amb = reduced ? 0 : 1 - p;

      cx = lerp(cx, mx, 0.06);
      cy = lerp(cy, my, 0.06);

      inner!.style.transform = `rotateX(${(lerp(6, 0, p) - cy * 3).toFixed(
        2,
      )}deg) rotateY(${(lerp(-4, 0, p) + cx * 4).toFixed(2)}deg)`;

      for (let i = 0; i < N; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const pose = poseAt(i, u, p);
        if (amb > 0.001) {
          pose.ry += Math.sin(now / 1500 + i * 1.7) * 4 * amb;
          pose.z += Math.sin(now / 1900 + i * 1.1) * u * 0.05 * amb;
          pose.y += Math.cos(now / 2100 + i) * u * 0.03 * amb;
        }
        el.style.transform = poseToTransform(pose);
        const behind = Math.max(0, -pose.z);
        el.style.filter = behind > 4 ? `blur(${Math.min(behind / 44, 9).toFixed(2)}px)` : "none";
        el.style.opacity = (1 - clamp(behind / (u * 3), 0, 0.55)).toFixed(3);
        el.style.zIndex = String(1000 + Math.round(pose.z));
      }

      if (headlineRef.current) {
        const eff = reduced ? 0 : p;
        headlineRef.current.style.transform = `translateY(${(-eff * 46).toFixed(1)}px)`;
        headlineRef.current.style.opacity = (
          1 - clamp((eff - 0.72) / 0.28, 0, 1) * 0.92
        ).toFixed(3);
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = reduced
          ? "0"
          : (1 - clamp(p / 0.06, 0, 1)).toFixed(3);
      }

      if (running) raf = requestAnimationFrame(frameLoop);
    }

    raf = requestAnimationFrame(frameLoop);

    return () => {
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);

  return (
    <section
      ref={trackRef}
      data-lp-surface="dark"
      className="lp-section lp-dark lp-track"
      style={{ height: reduced ? "100svh" : "320vh" }}
      aria-label="Órbita — visão geral"
    >
      <div className="lp-stage-wrap">
        <div className="lp-hero-glow" aria-hidden />

        <div className="lp-stage">
          <div ref={innerRef} className="lp-stage-inner">
            {HERO_MOCKS.map((mock, i) => (
              <div
                key={mock.key}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className={`lp-card${i === FOCAL ? " lp-card--focal" : ""}`}
                style={{ transform: initial[i] }}
              >
                <div className="lp-card-body">{mock.node}</div>
              </div>
            ))}
          </div>
        </div>

        {/* rótulos de canto */}
        <div className="pointer-events-none absolute inset-0 mx-auto max-w-[1400px] px-[clamp(1rem,3.5vw,2.25rem)]">
          <div
            ref={headlineRef}
            className="pointer-events-auto absolute bottom-[12vh] left-[clamp(1rem,3.5vw,2.25rem)] max-w-[min(90vw,44rem)] will-change-transform"
          >
            <p className="lp-eyebrow mb-3.5">Treino · Dieta · Metas · Evolução</p>
            <h1 className="lp-display text-[clamp(1.8rem,3.3vw,2.9rem)]">
              <ScrambleText text="Todo o seu acompanhamento" duration={720} />
              <br />
              <span className="lp-dim">físico em um só lugar.</span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href="/cadastrar" className="lp-btn lp-btn-primary">
                Criar conta
                <ArrowRightIcon />
              </Link>
              <Link href="/entrar" className="lp-btn lp-btn-ghost">
                Já tenho conta
              </Link>
            </div>
          </div>

          <p className="lp-eyebrow absolute bottom-[12vh] right-[clamp(1rem,3.5vw,2.25rem)] hidden max-w-[22ch] text-right leading-relaxed xl:block">
            pare de espalhar treinos, dieta, peso e medidas por planilhas e apps
            diferentes.
          </p>

          <div
            ref={hintRef}
            className="lp-eyebrow absolute bottom-6 left-1/2 -translate-x-1/2 text-center"
          >
            role para explorar
          </div>
        </div>
      </div>
    </section>
  );
}
