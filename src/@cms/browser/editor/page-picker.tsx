/** Modal list of the site's pages to pick a link target from (with a filter). */

import { request } from "@cms/browser/utils/http";
import { loadText, storeText } from "@cms/browser/utils/tab-storage";
import { toHtml } from "@cms/browser/utils/to-html";
import type { PageSummary } from "@cms/content/pages";
import { XIcon } from "@cms/universal/icons";

/** The search is kept per browser tab, apart from the page list's filter. */
const FILTER_KEY = "cms-page-picker-filter";

/** Resolves with the chosen page's path (slug) or null. */
export async function pickPage(): Promise<string | null> {
  const dialog = document.createElement("dialog");
  dialog.className = "file-dialog page-picker";
  dialog.setAttribute("aria-labelledby", "page-picker-title");
  document.body.append(dialog);

  const res = await request<PageSummary[]>("GET", "api/pages");
  // by path, segment by segment: /blog/post right after /blog, before /blog-archive
  const sortKey = (slug: string) => slug.replaceAll("/", "\u0000");
  const pages = (res.ok ? res.data : []).sort((a, b) =>
    sortKey(a.slug) < sortKey(b.slug) ? -1 : 1,
  );

  dialog.innerHTML = toHtml(
    <>
      <header>
        <h2 id="page-picker-title">Link to a page</h2>
        <button type="button" class="drawer-close" data-close title="Close" aria-label="Close">
          <XIcon />
        </button>
      </header>
      {!res.ok && <p class="errors">{res.error}</p>}
      <input
        type="search"
        class="page-picker-filter"
        placeholder="Filter by path or title…"
        aria-label="Filter pages"
        autocomplete="off"
      />
      <ul class="page-picker-list">
        {pages.map((p) => (
          <li data-search={`${p.title} ${p.slug}`.toLowerCase()}>
            <button type="button" data-pick={p.slug} title={`${p.title}\n${p.slug}`}>
              <span class="page-picker-text">
                <span class="page-picker-title">{p.title}</span>
                <code>{p.slug}</code>
              </span>
              {p.status !== "published" && <span class={`badge ${p.status}`}>{p.status}</span>}
            </button>
          </li>
        ))}
      </ul>
    </>,
  );
  dialog.showModal();
  const filter = dialog.querySelector<HTMLInputElement>(".page-picker-filter")!;
  const apply = () => {
    const q = filter.value.trim().toLowerCase();
    dialog.querySelectorAll<HTMLElement>("[data-search]").forEach((li) => {
      li.hidden = !li.dataset.search!.includes(q);
    });
  };
  // the last search of this tab (selected: typing replaces it)
  filter.value = loadText(FILTER_KEY);
  apply();
  filter.focus();
  filter.select();

  return new Promise((resolve) => {
    const done = (value: string | null) => {
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    dialog.addEventListener("cancel", () => done(null));
    filter.addEventListener("input", () => {
      storeText(FILTER_KEY, filter.value);
      apply();
    });
    // Enter in the filter picks the first visible page
    filter.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const first = dialog.querySelector<HTMLElement>("li:not([hidden]) [data-pick]");
        if (first) {
          done(first.dataset.pick!);
        }
      }
    });
    dialog.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (target === dialog || target.closest("[data-close]")) {
        return done(null);
      }
      const pick = target.closest<HTMLElement>("[data-pick]");
      if (pick) {
        done(pick.dataset.pick!);
      }
    });
  });
}
