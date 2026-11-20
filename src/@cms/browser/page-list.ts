/**
 * Filter of the page list: shows only the pages whose title or path contains the text.
 * The text is kept per browser tab, so it's still there after editing a page.
 */

const KEY = "cms-page-filter";

/** sessionStorage may be unavailable (blocked, private mode): the filter then just isn't kept. */
function load() {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

function store(value: string) {
  try {
    if (value) {
      sessionStorage.setItem(KEY, value);
    } else {
      sessionStorage.removeItem(KEY);
    }
  } catch {
    // not kept
  }
}

export default function initPageFilter(input: HTMLInputElement) {
  const rows = document.querySelectorAll<HTMLElement>("#page-list tbody tr[data-search]");
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    rows.forEach((row) => {
      row.hidden = !row.dataset.search!.includes(q);
    });
  };
  input.value = load();
  apply();
  input.addEventListener("input", () => {
    store(input.value);
    apply();
  });
}
