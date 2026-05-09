/**
 * Copia texto al portapapeles. Usa la API moderna y, si falla (p. ej. Safari),
 * textarea + document.execCommand('copy').
 */
export async function copyTextToClipboard(texto) {
  const value = texto ?? "";
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return { ok: true };
    }
  } catch {
    /* fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return { ok };
  } catch {
    return { ok: false };
  }
}
