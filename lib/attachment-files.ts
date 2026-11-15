export const maxAttachmentBytes = 2 * 1024 * 1024;
export const maxProductAttachmentBytes = 50 * 1024 * 1024;
export function validateAttachment(name: string, bytes: Uint8Array): {name: string; type: string} {
  if (!bytes.length || bytes.length > maxAttachmentBytes) throw new Error("Choose a nonempty file up to 2 MB.");
  const safeName = name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0,180);
  const ext = safeName.toLowerCase().split(".").pop();
  const starts = (...values: number[]) => values.every((v,i) => bytes[i] === v);
  let type = "";
  if (ext === "png" && starts(137,80,78,71,13,10,26,10)) type="image/png";
  if (["jpg","jpeg"].includes(ext || "") && starts(255,216,255)) type="image/jpeg";
  if (ext === "webp" && starts(82,73,70,70) && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP") type="image/webp";
  if (ext === "pdf" && starts(37,80,68,70,45)) type="application/pdf";
  if (["txt","md","csv","json"].includes(ext || "")) {
    try { new TextDecoder("utf-8", {fatal:true}).decode(bytes); } catch { throw new Error("Text files must use UTF-8."); }
    if (bytes.includes(0)) throw new Error("Binary content is not allowed in text files.");
    type="text/plain; charset=utf-8";
  }
  if (!type) throw new Error("Supported files: PNG, JPEG, WebP, PDF, TXT, Markdown, CSV and JSON. File contents must match the extension.");
  return {name:safeName,type};
}
