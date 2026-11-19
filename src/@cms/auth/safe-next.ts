/** Only redirects within the admin after login (never to another site). */
export function safeNext(next: string | null, cmsPath: string) {
  // Also keeps the value usable as a Location header.
  if (!next?.startsWith(cmsPath) || /[^\x21-\x7e]|\\/.test(next)) {
    return cmsPath;
  }
  // Resolved like in a browser, so "/admin/../other" doesn't count as a path of the admin.
  const { pathname } = new URL(next, "http://localhost");
  const inAdmin = pathname === cmsPath || pathname.startsWith(`${cmsPath}/`);
  return inAdmin && !pathname.startsWith(`${cmsPath}/login`) ? next : cmsPath;
}
