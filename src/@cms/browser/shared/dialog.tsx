/** Modal dialogs for the admin (replacement for window.confirm / alert). */
import { toHtml } from "@cms/browser/shared/to-html";

export interface DialogOptions {
  title: string;
  /** text or JSX */
  message?: unknown;
  confirmLabel?: string;
  /** null hides the cancel button (alert) */
  cancelLabel?: string | null;
  /** destructive action: red button, focus starts on cancel */
  danger?: boolean;
}

/**
 * Shows `content` in a modal dialog, which is removed again when it closes.
 * Resolves with what `result` reads from the closed dialog.
 */
export function openModal<T>({
  content,
  result,
  onOpen,
  className = "modal",
  labelledBy = "modal-title",
  dismissValue = "cancel",
}: {
  content: unknown;
  result: (dialog: HTMLDialogElement) => T;
  /** wires the dialog's controls and sets the focus */
  onOpen?: (dialog: HTMLDialogElement) => void;
  className?: string;
  labelledBy?: string;
  /** return value of a click on the backdrop; null keeps the dialog open */
  dismissValue?: string | null;
}): Promise<T> {
  const dialog = document.createElement("dialog");
  dialog.className = className;
  dialog.setAttribute("aria-labelledby", labelledBy);
  dialog.innerHTML = toHtml(content);
  document.body.append(dialog);
  dialog.showModal();
  onOpen?.(dialog);

  return new Promise((resolve) => {
    if (dismissValue !== null) {
      dialog.addEventListener("click", (e) => {
        if (e.target === dialog) {
          dialog.close(dismissValue);
        }
      });
    }
    dialog.addEventListener("close", () => {
      resolve(result(dialog));
      dialog.remove();
    });
  });
}

function Dialog({ title, message, confirmLabel, cancelLabel, danger }: DialogOptions) {
  return (
    <form method="dialog">
      <div class="modal-body">
        {danger && (
          <span class="modal-icon" aria-hidden="true">
            !
          </span>
        )}
        <div>
          <h2 id="modal-title">{title}</h2>
          {message && <div class="modal-message">{message}</div>}
        </div>
      </div>
      <footer class="modal-actions">
        {cancelLabel !== null && (
          <button type="submit" value="cancel" data-autofocus={danger ? "" : undefined}>
            {cancelLabel ?? "Cancel"}
          </button>
        )}
        <button
          type="submit"
          value="confirm"
          class={danger ? "danger-solid" : "primary"}
          data-autofocus={danger ? undefined : ""}
        >
          {confirmLabel ?? "OK"}
        </button>
      </footer>
    </form>
  );
}

/** Shows a modal dialog. Resolves true if confirmed, false if cancelled (button, Esc or backdrop). */
export function confirmDialog(options: DialogOptions): Promise<boolean> {
  return openModal({
    content: <Dialog {...options} />,
    onOpen: (dialog) => dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus(),
    result: (dialog) => dialog.returnValue === "confirm",
  });
}

/** Shows a message with a single button. */
export function alertDialog(options: Omit<DialogOptions, "cancelLabel">) {
  return confirmDialog({ confirmLabel: "OK", ...options, cancelLabel: null }).then(
    (): void => undefined,
  );
}

/** Asks for a line of text. Resolves the trimmed text, or null if cancelled. */
export function promptDialog({
  title,
  label,
  value = "",
  confirmLabel = "OK",
  maxLength = 80,
}: {
  title: string;
  label: string;
  value?: string;
  confirmLabel?: string;
  maxLength?: number;
}): Promise<string | null> {
  return openModal({
    content: (
      <form method="dialog">
        <div class="modal-body">
          <div class="modal-field">
            <h2 id="modal-title">{title}</h2>
            <label class="field">
              <span>{label}</span>
              <input
                type="text"
                name="value"
                value={value}
                required
                maxlength={maxLength}
                autocomplete="off"
              />
            </label>
          </div>
        </div>
        <footer class="modal-actions">
          <button type="button" data-cancel>
            Cancel
          </button>
          <button type="submit" value="confirm" class="primary">
            {confirmLabel}
          </button>
        </footer>
      </form>
    ),
    onOpen(dialog) {
      const input = dialog.querySelector("input")!;
      input.focus();
      input.select();
      dialog
        .querySelector("[data-cancel]")!
        .addEventListener("click", () => dialog.close("cancel"));
    },
    result: (dialog) =>
      dialog.returnValue === "confirm" ? dialog.querySelector("input")!.value.trim() || null : null,
  });
}
