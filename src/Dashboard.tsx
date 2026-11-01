import { motion } from "motion/react";
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { PRIORITIES, PRIORITY_LABELS, type CompletedSprint, type Priority } from "./board";
import { formatDate, localIsoDate } from "./dates";
import { WEEK } from "./repeat";
import { recap, type Recap } from "./stats";
import { Button, cn, formatPoints } from "./ui";

const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

const PRIORITY_FILLS: Record<Priority, { fill: string; ink: string }> = {
  // Text inside a fill is white or near-black by the fill's luminance.
  high: { fill: "var(--viz-high)", ink: "#ffffff" },
  medium: { fill: "var(--viz-medium)", ink: "#0b0b0b" },
  low: { fill: "var(--viz-low)", ink: "#ffffff" },
};

export function Dashboard({ history, onGoToBoard }: { history: CompletedSprint[]; onGoToBoard: () => void }) {
  if (history.length === 0) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-dashed border-zinc-300 bg-white/50 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/40">
        <h2 className="font-display text-2xl font-bold text-balance">Seu painel aparece aqui</h2>
        <p className="max-w-md text-sm text-pretty text-zinc-600 dark:text-zinc-400">
          Conclua sua primeira sprint para ver sua velocidade, os dias em que você mais produz e o histórico de tudo o
          que já entregou.
        </p>
        <Button variant="primary" onClick={onGoToBoard}>
          Ir para o quadro
        </Button>
      </section>
    );
  }

  const r = recap(history, (iso) => localIsoDate(new Date(iso)));
  return (
    <div className="flex flex-col gap-4">
      <StatRow r={r} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Panel
          className="lg:col-span-3"
          title="Velocidade por sprint"
          subtitle={`Pontos entregues em cada sprint · média de ${formatPoints(r.averagePoints ?? 0)}`}
        >
          <ColumnChart
            label="Pontos entregues"
            data={r.sprints.map((s) => ({
              key: s.id,
              label: s.name,
              value: s.points,
              detail: `${formatDate(s.startDate)} – ${formatDate(s.endDate)} · ${s.cards} ${s.cards === 1 ? "cartão" : "cartões"}`,
            }))}
            format={(v) => formatPoints(v)}
            average={r.averagePoints}
          />
        </Panel>
        <WeekdayPanel r={r} />
      </div>
      <PriorityPanel r={r} />
      <SprintTable r={r} />
    </div>
  );
}

function StatRow({ r }: { r: Recap }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <Stat label="Sprints concluídas" value={number.format(r.sprints.length)} index={0} />
      <Stat label="Cartões concluídos" value={number.format(r.totalCards)} index={1} />
      <Stat label="Pontos entregues" value={number.format(r.totalPoints)} index={2} />
      <Stat
        label="Velocidade média"
        value={`${number.format(r.averagePoints ?? 0)} pts`}
        delta={r.lastDelta}
        index={3}
      />
      <Stat
        label="Maior sequência"
        value={`${r.longestStreak} ${r.longestStreak === 1 ? "dia" : "dias"}`}
        hint="seguidos concluindo algo"
        index={4}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  delta,
  hint,
  index,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
      className="flex flex-col gap-1 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10"
    >
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</p>
      <p className="font-display text-3xl font-bold">{value}</p>
      {delta !== undefined && delta !== null && <Delta value={delta} />}
      {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>}
    </motion.div>
  );
}

/** Change in points versus the previous sprint; more points is better. */
function Delta({ value }: { value: number }) {
  const up = value > 0;
  const flat = value === 0;
  return (
    <p
      className={cn(
        "flex items-center gap-1 text-xs font-semibold",
        flat ? "text-zinc-500" : up ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400",
      )}
    >
      {!flat && (
        <svg viewBox="0 0 12 12" className={cn("size-3", !up && "rotate-180")} aria-hidden>
          <path d="M6 2l4.5 6h-9z" fill="currentColor" />
        </svg>
      )}
      {flat ? "Igual à" : `${up ? "+" : "−"}${formatPoints(Math.abs(value))} vs`} sprint anterior
    </p>
  );
}

function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15, ease: "easeOut" }}
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-900 dark:ring-white/10",
        className,
      )}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="font-display text-lg font-bold text-balance">{title}</h2>
        {subtitle && <p className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">{subtitle}</p>}
      </div>
      {children}
    </motion.section>
  );
}

function WeekdayPanel({ r }: { r: Recap }) {
  const values = WEEK.map((w) => r.byWeekday[w.day] ?? 0);
  const best = Math.max(...values);
  const bestDay = best > 0 ? WEEK[values.indexOf(best)]! : null;
  const fullNames: Record<string, string> = {
    Seg: "segunda",
    Ter: "terça",
    Qua: "quarta",
    Qui: "quinta",
    Sex: "sexta",
    Sáb: "sábado",
    Dom: "domingo",
  };

  return (
    <Panel
      className="lg:col-span-2"
      title="Dias mais produtivos"
      subtitle={bestDay ? `Você conclui mais cartões na ${fullNames[bestDay.short]}` : "Cartões concluídos por dia"}
    >
      <ColumnChart
        label="Cartões concluídos"
        data={WEEK.map((w, i) => ({ key: String(w.day), label: w.short, value: values[i]! }))}
        format={(v) => `${v} ${v === 1 ? "cartão" : "cartões"}`}
        emphasize={(d) => best > 0 && d.value === best}
      />
    </Panel>
  );
}

interface Datum {
  key: string;
  label: string;
  value: number;
  detail?: string;
}

function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

/** A round axis maximum with a 1/2/5 step, so ticks land on clean numbers. */
function niceScale(max: number): { top: number; step: number } {
  const raw = Math.max(max, 1) / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!;
  return { top: Math.ceil(Math.max(max, 1) / step) * step, step: Math.max(1, step) };
}

/** A column path with a 4px rounded data end and a square foot on the baseline. */
function columnPath(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

/**
 * A single-series column chart: thin columns on one baseline, hairline grid,
 * an optional average line, and a tooltip on hover or keyboard focus.
 * `emphasize` picks columns to show in the accent; the rest go gray.
 */
function ColumnChart({
  data,
  label,
  format,
  average,
  emphasize,
}: {
  data: Datum[];
  label: string;
  format: (value: number) => string;
  average?: number | null;
  emphasize?: (d: Datum) => boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const [active, setActive] = useState<number | null>(null);

  const height = 220;
  const pad = { top: 22, right: average != null ? 52 : 8, bottom: 28, left: 30 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = height - pad.top - pad.bottom;
  const { top, step } = niceScale(Math.max(...data.map((d) => d.value), average ?? 0));
  const y = (v: number) => pad.top + innerH * (1 - v / top);
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(24, band * 0.6);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Label the tallest column and the latest one; the axis and tooltip carry the rest.
  const maxIndex = data.reduce((best, d, i) => (d.value > data[best]!.value ? i : best), 0);
  const labelled = new Set([maxIndex, data.length - 1]);
  const xLabelEvery = Math.ceil(data.length / Math.max(1, Math.floor(innerW / 56)));
  const activeDatum = active === null ? null : data[active];

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label} className="overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--viz-axis)" : "var(--viz-grid)"}
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={pad.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-(--viz-muted) text-[11px] tabular-nums"
              >
                {t}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const cx = pad.left + band * i + band / 2;
            const h = innerH * (d.value / top);
            const accent = emphasize ? emphasize(d) : true;
            return (
              <g key={d.key}>
                {h > 0 && (
                  <motion.path
                    d={columnPath(cx - barW / 2, y(d.value), barW, h)}
                    fill={accent ? "var(--viz-series)" : "var(--viz-axis)"}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1, opacity: active === null || active === i ? 1 : 0.45 }}
                    transition={{
                      scaleY: { type: "spring", stiffness: 140, damping: 20, delay: 0.2 + i * 0.04 },
                      opacity: { duration: 0.15 },
                    }}
                    style={{ originY: 1, transformBox: "fill-box" }}
                  />
                )}
                {labelled.has(i) && d.value > 0 && (
                  <text
                    x={cx}
                    y={y(d.value) - 6}
                    textAnchor="middle"
                    className="fill-zinc-700 text-[11px] font-semibold tabular-nums dark:fill-zinc-300"
                  >
                    {d.value}
                  </text>
                )}
                {i % xLabelEvery === 0 && (
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    className="fill-(--viz-muted) text-[11px]"
                  >
                    {d.label.length > 10 ? `${d.label.slice(0, 9)}…` : d.label}
                  </text>
                )}
                {/* Hit target: the whole band, not just the painted column. */}
                <rect
                  x={pad.left + band * i}
                  y={pad.top}
                  width={band}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${d.label}: ${format(d.value)}`}
                  className="outline-none focus-visible:stroke-violet-500 focus-visible:stroke-2"
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                />
              </g>
            );
          })}

          {average != null && average > 0 && (
            <g className="pointer-events-none">
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y(average)}
                y2={y(average)}
                stroke="var(--viz-muted)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
              <text
                x={width - pad.right + 6}
                y={y(average)}
                dy="0.32em"
                className="fill-zinc-600 text-[11px] font-medium dark:fill-zinc-400"
              >
                média
              </text>
            </g>
          )}
        </svg>
      )}

      {activeDatum && active !== null && (
        <Tooltip x={pad.left + band * active + band / 2} y={y(activeDatum.value)}>
          <span className="text-sm font-bold tabular-nums">{format(activeDatum.value)}</span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span
              className="h-0.5 w-3 rounded-full"
              style={{ background: emphasize && !emphasize(activeDatum) ? "var(--viz-axis)" : "var(--viz-series)" }}
            />
            {activeDatum.label}
          </span>
          {activeDatum.detail && <span className="text-xs text-zinc-500">{activeDatum.detail}</span>}
        </Tooltip>
      )}
    </div>
  );
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 flex -translate-x-1/2 -translate-y-full flex-col gap-0.5 rounded-xl bg-white px-3 py-2 whitespace-nowrap shadow-lg ring-1 ring-zinc-900/10 dark:bg-zinc-800 dark:ring-white/10"
      style={{ left: x, top: y - 10 }}
      role="tooltip"
    >
      {children}
    </div>
  );
}

function PriorityPanel({ r }: { r: Recap }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const [active, setActive] = useState<Priority | null>(null);
  const total = PRIORITIES.reduce((sum, p) => sum + r.byPriority[p], 0);
  // Highest priority first, matching the legend order.
  const order: Priority[] = ["high", "medium", "low"];
  const parts = order.filter((p) => r.byPriority[p] > 0);

  return (
    <Panel title="Prioridade do que você concluiu" subtitle={`${total} ${total === 1 ? "cartão" : "cartões"} no total`}>
      <div ref={ref} className="relative flex h-7 w-full gap-0.5" role="img" aria-label={parts
        .map((p) => `${PRIORITY_LABELS[p]}: ${r.byPriority[p]}`)
        .join(", ")}>
        {parts.map((p, i) => {
          const share = r.byPriority[p] / total;
          const text = `${Math.round(share * 100)}%`;
          const fits = share * width >= text.length * 8 + 16;
          return (
            <motion.div
              key={p}
              tabIndex={0}
              aria-label={`${PRIORITY_LABELS[p]}: ${r.byPriority[p]} (${text})`}
              initial={{ opacity: 0, scaleX: 0.6 }}
              animate={{ opacity: active === null || active === p ? 1 : 0.5, scaleX: 1 }}
              transition={{ duration: 0.35, delay: 0.25 + i * 0.06, ease: "easeOut" }}
              style={{ flexGrow: share, flexBasis: 0, background: PRIORITY_FILLS[p].fill, originX: 0 }}
              className="relative flex min-w-1 items-center rounded px-2 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
              onPointerEnter={() => setActive(p)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(p)}
              onBlur={() => setActive(null)}
            >
              {fits && (
                <span className="text-xs font-bold tabular-nums" style={{ color: PRIORITY_FILLS[p].ink }}>
                  {text}
                </span>
              )}
              {active === p && (
                <Tooltip x={0} y={-2}>
                  <span className="text-sm font-bold tabular-nums">
                    {r.byPriority[p]} {r.byPriority[p] === 1 ? "cartão" : "cartões"} · {text}
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">Prioridade {PRIORITY_LABELS[p].toLowerCase()}</span>
                </Tooltip>
              )}
            </motion.div>
          );
        })}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        {parts.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: PRIORITY_FILLS[p].fill }} aria-hidden />
            {PRIORITY_LABELS[p]}
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function SprintTable({ r }: { r: Recap }) {
  return (
    <Panel title="Todas as sprints">
      <div className="-mx-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="text-xs text-zinc-500 dark:text-zinc-400">
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-5 py-2 font-medium">Sprint</th>
              <th className="px-3 py-2 font-medium">Período</th>
              <th className="px-3 py-2 text-right font-medium">Cartões</th>
              <th className="px-3 py-2 text-right font-medium">Pontos</th>
              <th className="px-5 py-2 font-medium">Meta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {[...r.sprints].reverse().map((s) => (
              <tr key={s.id} className="transition-colors duration-150 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                <td className="px-5 py-3 font-semibold whitespace-nowrap">{s.name}</td>
                <td className="px-3 py-3 whitespace-nowrap text-zinc-600 tabular-nums dark:text-zinc-400">
                  {formatDate(s.startDate)} – {formatDate(s.endDate)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{s.cards}</td>
                <td className="px-3 py-3 text-right tabular-nums">{s.points}</td>
                <td className="max-w-xs truncate px-5 py-3 text-zinc-600 dark:text-zinc-400">{s.goal || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
