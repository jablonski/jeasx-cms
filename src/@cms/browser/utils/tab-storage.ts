/**
 * Small texts kept per browser tab (sessionStorage), e.g. the text of a filter.
 * Storage may be unavailable (blocked, private mode): the text then just isn't kept.
 */

export function loadText(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** Empty text removes the entry. */
export function storeText(key: string, value: string): void {
  try {
    if (value) {
      sessionStorage.setItem(key, value);
    } else {
      sessionStorage.removeItem(key);
    }
  } catch {
    // not kept
  }
}
