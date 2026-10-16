// Passphrase gate + content decryption. The actual plan lives in
// data.enc.json as AES-256-GCM ciphertext, keyed by PBKDF2-SHA256(passphrase,
// salt, iterations) — both salt and iteration count travel with the file
// itself (self-describing, see blob.kdf/blob.iterations/blob.salt) so a
// future iteration-count bump is a one-script change, not a two-file one.
// Unlike a plain "hide it in JS" trick, the raw file is unreadable even via
// direct URL / raw.githubusercontent.com access, not just hidden behind this
// screen — and unlike a single fast hash, it's deliberately slow to
// brute-force offline against a downloaded copy of the public ciphertext.
const STORAGE_KEY = "gymfit-key-v2";
const DEFAULT_ITERATIONS = 600000; // fallback only; blob.iterations is authoritative

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64(bytes) {
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

let blobPromise = null;
function fetchBlob() {
  if (!blobPromise) blobPromise = fetch("data.enc.json").then((res) => res.json());
  return blobPromise;
}

async function deriveKeyBytes(passphrase, saltBytes, iterations) {
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" }, keyMaterial, 256);
  return new Uint8Array(bits);
}

async function importAesKey(keyBytes) {
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
}

async function decryptWithKey(keyBytes, blob) {
  const key = await importAesKey(keyBytes);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(blob.iv) }, key, b64ToBytes(blob.ct));
  return JSON.parse(new TextDecoder().decode(plainBuf));
}

function reveal() {
  document.getElementById("lock-screen").remove();
  document.getElementById("app-root").hidden = false;
}

function loadRenderer(DATA) {
  const s = document.createElement("script");
  s.src = "render.js";
  s.onload = () => mountApp(DATA);
  document.body.appendChild(s);
}

function setUnlocking(isUnlocking) {
  const btn = document.getElementById("lock-submit");
  if (!btn) return; // reveal() may have already removed #lock-screen on success
  btn.disabled = isUnlocking;
  btn.textContent = isUnlocking ? "Unlocking…" : "Unlock";
}

async function tryUnlock(passphrase) {
  setUnlocking(true);
  try {
    const blob = await fetchBlob();
    const keyBytes = await deriveKeyBytes(passphrase, b64ToBytes(blob.salt), blob.iterations || DEFAULT_ITERATIONS);
    const DATA = await decryptWithKey(keyBytes, blob);
    localStorage.setItem(STORAGE_KEY, bytesToB64(keyBytes));
    reveal();
    loadRenderer(DATA);
  } catch (e) {
    const err = document.getElementById("lock-error");
    err.textContent = "Wrong passphrase.";
    document.getElementById("lock-input").value = "";
  } finally {
    setUnlocking(false);
  }
}

(async function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const DATA = await decryptWithKey(b64ToBytes(stored), await fetchBlob());
      reveal();
      loadRenderer(DATA);
      return;
    } catch (e) {
      localStorage.removeItem(STORAGE_KEY); // stale/invalid key — fall through to prompt
    }
  }
  document.getElementById("lock-input").focus();
  document.getElementById("lock-submit").addEventListener("click", () => {
    tryUnlock(document.getElementById("lock-input").value);
  });
  document.getElementById("lock-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryUnlock(document.getElementById("lock-input").value);
  });
})();
