import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { clsx, type ClassValue } from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 pt", "3 pts". */
export function formatPoints(n: number): string {
  return `${n} ${n === 1 ? "pt" : "pts"}`;
}

type ButtonVariant = "default" | "primary" | "danger" | "ghost";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  default:
    "border border-zinc-200 bg-white text-zinc-900 shadow-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
  primary: "bg-blue-600 text-white shadow-xs hover:bg-blue-700",
  danger: "bg-red-600 text-white shadow-xs hover:bg-red-700",
  ghost: "text-zinc-600 hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100",
};

export const buttonClasses = (variant: ButtonVariant = "default", className?: string) =>
  cn(
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap select-none",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50",
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
  "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs",
  "placeholder:text-zinc-400 focus:border-blue-600 focus:outline-2 focus:-outline-offset-1 focus:outline-blue-600",
  "dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
);

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {label}
      {children}
    </label>
  );
}

const backdropClasses = "fixed inset-0 z-40 min-h-dvh bg-zinc-950/40 supports-[-webkit-touch-callout:none]:absolute";
const popupClasses = cn(
  "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-y-auto",
  "rounded-xl border border-zinc-200 bg-white text-zinc-900 shadow-xl dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100",
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
          <Dialog.Title className="px-6 pt-5 text-base font-semibold text-balance">{title}</Dialog.Title>
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800">
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
        <AlertDialog.Popup className={cn(popupClasses, "max-w-sm gap-4 p-6")}>
          <div className="flex flex-col gap-1.5">
            <AlertDialog.Title className="text-base font-semibold text-balance">{title}</AlertDialog.Title>
            <AlertDialog.Description className="text-sm text-pretty text-zinc-600 dark:text-zinc-400">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex justify-end gap-2">
            <AlertDialog.Close className={buttonClasses("default")}>Cancel</AlertDialog.Close>
            <AlertDialog.Close className={buttonClasses("danger")} onClick={onConfirm}>
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4" aria-hidden>
      <path d="M8 3v10M3 8h10" strokeLinecap="round" />
    </svg>
  );
}

export function RepeatIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="size-3.5" aria-hidden>
      <path d="M2.5 7V6a2 2 0 0 1 2-2h8.5M11 2l2 2-2 2M13.5 9v1a2 2 0 0 1-2 2H3m2 2-2-2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-4" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
