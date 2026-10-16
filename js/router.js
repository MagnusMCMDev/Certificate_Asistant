export function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs] = raw.split("?");
  return { path: path || "", params: new URLSearchParams(qs || "") };
}

export function go(path, params) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  location.hash = "#/" + path + qs;
}

export function onRoute(handler) {
  window.addEventListener("hashchange", handler);
}
