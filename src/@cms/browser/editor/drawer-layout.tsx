/** Header, scrolling body and footer shared by the editor's side dialogs. */
import { XIcon } from "@cms/shared/icons";
export default function DrawerLayout({
  icon,
  title,
  description,
  closeAction = "drawer-done",
  footer,
  children,
}: {
  icon: JSX.Element;
  title: string;
  description?: string;
  /** what the close button in the header does */
  closeAction?: "drawer-done" | "drawer-cancel";
  footer: unknown;
  children?: unknown;
}) {
  return (
    <>
      <header class="drawer-header">
        <span class="drawer-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <h2 id="drawer-title">{title}</h2>
          {description && <p>{description}</p>}
        </div>
        <button type="button" class="drawer-close" data-action={closeAction} title="Close">
          <XIcon />
        </button>
      </header>
      <div class="drawer-body">{children}</div>
      <footer class="drawer-footer">{footer}</footer>
    </>
  );
}

/** The end of a dialog's footer: Cancel restores what was changed, Done keeps it. */
export function CancelAndDone() {
  return (
    <>
      <span class="spacer" />
      <button type="button" data-action="drawer-cancel">
        Cancel
      </button>
      <button type="button" class="primary" data-action="drawer-done">
        Done
      </button>
    </>
  );
}
