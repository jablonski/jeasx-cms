/** Appends the build id to an asset URL, so long-lived browser caches refresh on each deploy. */
export const cacheBuster = (href: string) =>
  `${href}${href.includes("?") ? "&" : "?"}v=${process.env.BUILD_ID}`;
