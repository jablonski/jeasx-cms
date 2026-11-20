/**
 * Filter of the page list: shows only the pages whose title or path contains the text.
 * The text is kept per browser tab, so it's still there after editing a page.
 */
import { loadText, storeText } from "@cms/browser/utils/tab-storage";

const KEY = "cms-page-filter";

export default function initPageFilter(input: HTMLInputElement) {
  const rows = document.querySelectorAll<HTMLElement>("#page-list tbody tr[data-search]");
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach((row) => {
      row.hidden = !row.dataset.search!.includes(q);
    });
  };
  input.value = loadText(KEY);
  apply();
  input.addEventListener("input", () => {
    storeText(KEY, input.value);
    apply();
  });
}
