import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { clsx, type ClassValue } from "clsx";
import { motion } from "motion/react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 pt", "3 pts" (pontos). */
export function formatPoints(n: number): string {
  return `${n} ${n === 1 ? "pt" : "pts"}`;
}

type ButtonVariant = "default" | "primary" | "danger" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    "border border-zinc-200 bg-white text-zinc-900 shadow-xs hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  primary:
    "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  ghost:
    "text-zinc-600 hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: ButtonVariant = "default", className?: string) =>
  cn(
    "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-semibold whitespace-nowrap select-none",
    "transition-[background-color,border-color,color,transform] duration-150 ease-out active:scale-[0.97]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:opacity-50",
    BUTTON_VARIANTS[variant],
    className,
  );

export function Button({
  variant,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type="button" className={buttonClasses(variant, className)} {...props} />;
}

export const fieldClasses = cn(
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-900 shadow-xs transition-colors duration-150",
  "placeholder:text-zinc-400 hover:border-zinc-300 focus:border-violet-500 focus:outline-3 focus:outline-violet-500/20",
  "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700",
);

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
      {label}
      {children}
    </label>
  );
}

const backdropClasses = cn(
  "fixed inset-0 z-40 min-h-dvh bg-zinc-950/40 transition-opacity duration-200 ease-out",
  "data-ending-style:opacity-0 data-starting-style:opacity-0 supports-[-webkit-touch-callout:none]:absolute",
);
const popupClasses = cn(
  "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto",
  "rounded-3xl border border-zinc-200 bg-white text-zinc-900 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
  "transition-[opacity,scale] duration-200 ease-out data-ending-style:scale-95 data-ending-style:opacity-0",
  "data-starting-style:scale-95 data-starting-style:opacity-0",
);

/** A modal dialog with a title. Escape, the backdrop and `onClose` all close it. */
export function Modal({
  title,
  onClose,
  children,
  className,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClasses} />
        <Dialog.Popup className={cn(popupClasses, "max-w-lg", className)}>
          <Dialog.Title className="px-7 pt-6 font-display text-xl font-bold text-balance">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/60 px-7 py-4 dark:border-zinc-800 dark:bg-zinc-950/30">
      {children}
    </div>
  );
}

/** Asks the user to confirm a destructive or irreversible action. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={backdropClasses} />
        <AlertDialog.Popup className={cn(popupClasses, "max-w-sm gap-5 p-7")}>
          <div className="flex flex-col gap-2">
            <AlertDialog.Title className="font-display text-lg font-bold text-balance">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close className={buttonClasses("default")}>Cancelar</AlertDialog.Close>
            <AlertDialog.Close className={buttonClasses("danger")} onClick={onConfirm}>
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Circular progress, 0–100. `onDark` styles it for a dark surface. */
export function ProgressRing({ percent, size = 72, onDark = false }: { percent: number; size?: number; onDark?: boolean }) {
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label="Progresso da sprint"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" width={size} height={size} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-white/15" : "stroke-zinc-900/8 dark:stroke-white/10"}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={onDark ? "stroke-violet-400" : "stroke-violet-600 dark:stroke-violet-400"}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - percent / 100) }}
          transition={{ type: "spring", stiffness: 60, damping: 18 }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

const BURST_COLORS = ["bg-violet-500", "bg-amber-400", "bg-emerald-500", "bg-sky-500", "bg-rose-500"];

/** A one-shot burst of confetti dots, for finishing a card. */
export function Celebration() {
  const pieces = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 38 + (i % 3) * 14;
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, color: BURST_COLORS[i % 5]! };
  });
  return (
    <span className="pointer-events-none absolute top-1/2 left-1/2 z-20" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={cn("absolute size-2 rounded-full", i % 2 === 0 && "rounded-sm", p.color)}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 1 }}
          animate={{ x: p.x, y: p.y, scale: [0.4, 1.1, 0.6], opacity: [1, 1, 0], rotate: i * 40 }}
          transition={{ duration: 0.75, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

const icon = (path: ReactNode, className = "size-4") => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden
  >
    {path}
  </svg>
);

export const PlusIcon = () => icon(<path d="M12 5v14M5 12h14" />);
export const ArrowRightIcon = () => icon(<path d="M5 12h14M13 6l6 6-6 6" />);
export const CheckIcon = ({ className }: { className?: string }) => icon(<path d="M5 12.5l4.5 4.5L19 7" />, className);
export const RepeatIcon = () =>
  icon(<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />, "size-3.5");
export const FlagIcon = () => icon(<path d="M4 22V4m0 0s1.5-1 5-1 5 2 8 2 3-1 3-1v11s-1 1-3 1-5-2-8-2-5 1-5 1" />);
export const CalendarIcon = () =>
  icon(<path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />, "size-3.5");
export const InboxIcon = () =>
  icon(<path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />);
export const ListIcon = () => icon(<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />);
export const ZapIcon = () => icon(<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />);
export const TrophyIcon = () =>
  icon(<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />);
export const HistoryIcon = () => icon(<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2" />);
