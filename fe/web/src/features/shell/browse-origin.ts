const key = "mootz:browse-origin";

export function rememberBrowseOrigin() {
  const { pathname, search } = window.location;
  if (pathname !== "/map" && pathname !== "/feed") return;
  try { sessionStorage.setItem(key, `${pathname}${search}`); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function getBrowseOrigin(): string {
  try {
    const value = sessionStorage.getItem(key);
    if (!value) return "/map";
    const url = new URL(value, window.location.origin);
    if (url.origin === window.location.origin && (url.pathname === "/map" || url.pathname === "/feed")) return `${url.pathname}${url.search}`;
  } catch { /* The feature remains closable when storage is unavailable. */ }
  return "/map";
}
