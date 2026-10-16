import { deriveKey, decryptBundle, exportKeyB64, importKeyB64 } from "./crypto.js";
import { setContent } from "./store.js";

const KEY = "ca:key:v1";
const LOAD_TIMEOUT_MS = 25000;
let _meta = null;
let _bin = null;

async function _get(url, as) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), LOAD_TIMEOUT_MS);
  try {
    const r = await fetch(url, { cache: "no-store", signal: ctrl.signal });
    if (!r.ok) throw new Error(url + " → HTTP " + r.status);
    return as === "json" ? await r.json() : await r.arrayBuffer();
  } catch (e) {
    const load = new Error(
      e.name === "AbortError"
        ? "No se pudo cargar el contenido (¿servidor caído? tardó demasiado)."
        : "No se pudo cargar el contenido: " + e.message
    );
    load.kind = "load";
    throw load;
  } finally {
    clearTimeout(timer);
  }
}

async function artifacts() {
  if (!_meta) _meta = await _get("./content.meta.json", "json");
  if (!_bin) _bin = await _get("./content.bin", "buf");
  return { meta: _meta, bin: _bin };
}

export async function login(username, password) {
  const { meta, bin } = await artifacts();
  const key = await deriveKey(username, password, meta);
  const content = await decryptBundle(meta, bin, key); // throws if creds wrong
  setContent(content);
  sessionStorage.setItem(KEY, await exportKeyB64(key));
  return content;
}

export async function restore() {
  const b64 = sessionStorage.getItem(KEY);
  if (!b64) return null;
  try {
    const { meta, bin } = await artifacts();
    const key = await importKeyB64(b64);
    const content = await decryptBundle(meta, bin, key);
    setContent(content);
    return content;
  } catch (e) {
    sessionStorage.removeItem(KEY);
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem(KEY);
  location.hash = "";
  location.reload();
}
