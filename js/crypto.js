function b64ToBytes(b64) {
  const bin = atob(b64);
  const a = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
  return a;
}

function bytesToB64(bytes) {
  let s = "";
  const a = new Uint8Array(bytes);
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

export async function deriveKey(username, password, meta) {
  const material = new TextEncoder().encode(username + "\x00" + password);
  const base = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: meta.kdf.hash, salt: b64ToBytes(meta.kdf.salt_b64), iterations: meta.kdf.iterations },
    base,
    { name: "AES-GCM", length: meta.cipher.key_bits },
    true, // extractable → so we can stash it in sessionStorage for the session
    ["decrypt"]
  );
}

async function gunzip(arrayBuffer) {
  const ds = new DecompressionStream("gzip");
  const stream = new Blob([arrayBuffer]).stream().pipeThrough(ds);
  return new Response(stream).arrayBuffer();
}

export async function decryptBundle(meta, cipherBytes, key) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64ToBytes(meta.cipher.iv_b64), tagLength: meta.cipher.tag_bits },
    key,
    cipherBytes
  );
  const json = await gunzip(plain);
  return JSON.parse(new TextDecoder().decode(json));
}

export async function exportKeyB64(key) {
  return bytesToB64(await crypto.subtle.exportKey("raw", key));
}

export async function importKeyB64(b64) {
  return crypto.subtle.importKey("raw", b64ToBytes(b64), { name: "AES-GCM" }, true, ["decrypt"]);
}

export function cryptoAvailable() {
  return !!(window.crypto && window.crypto.subtle) && typeof DecompressionStream !== "undefined";
}
