import { useEffect, useRef } from "react";

/** Ref for a <dialog> that opens as a modal when it mounts. */
export function useModalDialog() {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    // StrictMode runs this twice in dev; showModal on an open dialog throws.
    if (!ref.current?.open) ref.current?.showModal();
  }, []);
  return ref;
}
