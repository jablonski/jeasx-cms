import type { BlockPosition } from "@cms/browser/editor/paths";
import type { Block } from "@cms/universal/blocks";
import type { Field, ValidationError } from "@cms/universal/fields";
import type { Page } from "@cms/content/pages";

/** Everything the editor's parts share about the page being edited. */
export interface EditorState {
  page: Page;
  dirty: boolean;
  busy: boolean;
  errors: ValidationError[];
  message: string;
  /** id of the selected block */
  selected: string | null;
}

/** What the editor's parts can use of each other (assembled by startEditor in ./start-editor.tsx). */
export interface Editor {
  state: EditorState;
  /** contenteditable mode for inline editing */
  editable: "plaintext-only" | "true";
  /** element being edited inline (previews wait for it) */
  inlineEl: HTMLElement | null;
  blocksAt: (path: string) => Block[];
  itemsAt: (path: string) => Record<string, unknown>[];
  textAt: (path: string) => string;
  setAt: (path: string, value: unknown) => void;
  fieldAt: (path: string) => Field | undefined;
  allowedBlocksAt: (path: string) => readonly string[];
  locate: (blockId: string) => BlockPosition | null;
  select: (blockId: string | null, scroll?: boolean) => void;
  editBlock: (blockId: string) => void;
  editSettings: () => void;
  gotoError: (path: string) => void;
  markDirty: () => void;
  render: () => void;
  renderToolbar: () => void;
  updatePreview: (delay?: number) => void;
  runAction: (el: HTMLElement) => Promise<boolean>;
  save: (status?: EditorState["page"]["status"]) => void;
}
