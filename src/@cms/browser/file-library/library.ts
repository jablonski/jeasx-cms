import type { FolderView } from "@cms/browser/files/file-api";

/** What the parts of the file library page use of each other. */
export interface Library {
  /** the folder being shown */
  listing: () => FolderView;
  /** id of the folder being shown (null = top level) */
  current: () => number | null;
  /** replaces the problems shown above the files */
  setMessages: (messages: string[]) => void;
  open: (folder: number | null) => Promise<void>;
  reload: () => Promise<void>;
  upload: (files: File[]) => Promise<void>;
}
