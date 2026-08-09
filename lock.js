// Passphrase gate + content decryption. The actual plan lives in
// data.enc.json as AES-256-GCM ciphertext, keyed by SHA-256(passphrase) —
// so unlike a plain "hide it in JS" trick, the raw file is unreadable even
// via direct URL / raw.githubusercontent.com access, not just hidden behind
// this screen. The key derivation itself isn't a secret (SHA-256 is public
// knowledge) — the passphrase is the actual secret, same as before.
const STORAGE_KEY = "gymfit-key-v1";

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

async function deriveKeyBytes(passphrase) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(passphrase));
  return new Uint8Array(digest);
}

async function importKey(keyBytes) {
  return crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
}

async function decryptData(keyBytes) {
  const res = await fetch("data.enc.json");
  const { iv, ct } = await res.json();
  const key = await importKey(keyBytes);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBytes(iv) }, key, b64ToBytes(ct));
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

async function tryUnlock(passphrase) {
  const keyBytes = await deriveKeyBytes(passphrase);
  try {
    const DATA = await decryptData(keyBytes);
    localStorage.setItem(STORAGE_KEY, bytesToB64(keyBytes));
    reveal();
    loadRenderer(DATA);
  } catch (e) {
    const err = document.getElementById("lock-error");
    err.textContent = "Wrong passphrase.";
    document.getElementById("lock-input").value = "";
  }
}

(async function init() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      const DATA = await decryptData(b64ToBytes(stored));
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
