import React, { useCallback, useRef, useState } from "react";
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

export type ConfirmOptions = Omit<ConfirmDialogProps, "open" | "busy" | "onConfirm" | "onCancel">;

export function useConfirm() {
  const [request, setRequest] = useState<{
    options: ConfirmOptions;
    onConfirm?: () => void | Promise<void>;
  } | null>(null);
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const finish = useCallback((confirmed: boolean) => {
    const resolve = resolver.current;
    if (!resolve) return;
    resolver.current = null;
    setRequest(null);
    resolve(confirmed);
  }, []);

  const confirm = useCallback((options: ConfirmOptions, onConfirm?: () => void | Promise<void>) => {
    if (resolver.current) throw new Error("A confirmation dialog is already open.");
    setRequest({ options, onConfirm });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const dialog = request ? (
    <ConfirmDialog
      {...request.options}
      open
      onCancel={() => finish(false)}
      onConfirm={async () => {
        await request.onConfirm?.();
        finish(true);
      }}
    />
  ) : null;

  return { confirm, dialog };
}
