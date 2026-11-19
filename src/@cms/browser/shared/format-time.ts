/** SQLite stores UTC ("2026-11-17 15:12:44"); shown in the viewer's local time. */
export function formatTime(value: string) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

/** Converts times rendered on the server, which doesn't know the viewer's time zone. */
export function localizeTimes(root: ParentNode = document) {
  root.querySelectorAll("time[data-local-time]").forEach((el) => {
    el.textContent = formatTime(el.textContent ?? "");
  });
}
