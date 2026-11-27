export function createMediaStore({ db, randomBytes }) {
  async function profileMap() {
    const { data, error } = await db.from("upstatus_profiles").select("user_name,avatar_url");
    if (error) throw error;
    const out = {};
    for (const x of data || []) if (x.avatar_url) out[x.user_name] = x.avatar_url;
    return out;
  }

  function decodeDataUrl(raw) {
    const value = String(raw || "");
    const comma = value.indexOf(",");
    if (!value.toLowerCase().startsWith("data:") || comma < 0) throw new Error("Arquivo inválido.");
    const head = value.slice(5, comma);
    const semi = head.indexOf(";");
    const mime = (semi >= 0 ? head.slice(0, semi) : head).toLowerCase().trim();
    const meta = head.slice(Math.max(0, semi));
    if (!/;base64/i.test(meta)) throw new Error("Arquivo inválido.");
    const bin = atob(value.slice(comma + 1).replace(/\s/g, ""));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return { mime, bytes };
  }

  function sniffMime(bytes, declared) {
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "image/png";
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return "image/webp";
    if (bytes.length >= 4 && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return declared.startsWith("audio/") ? "audio/webm" : "video/webm";
    if (bytes.length >= 4 && bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) return "audio/ogg";
    if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) return "audio/mpeg";
    if (bytes.length >= 12 && bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) return declared === "video/mp4" ? "video/mp4" : declared.startsWith("audio/") ? "audio/mp4" : "image/jpeg";
    if (bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) return "audio/wav";
    return declared;
  }

  function ext(mime) {
    return ({
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "application/pdf": "pdf",
      "application/msword": "doc",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
      "application/vnd.ms-excel": "xls",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
      "text/csv": "csv",
      "application/vnd.ms-powerpoint": "ppt",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
      "text/plain": "txt",
      "text/rtf": "rtf",
      "application/rtf": "rtf",
      "video/mp4": "mp4",
      "video/webm": "webm",
      "audio/webm": "webm",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/x-wav": "wav",
      "audio/x-m4a": "m4a"
    })[mime] || "";
  }

  async function uploadFile(bucket, dataUrl, max, allowed) {
    const decoded = decodeDataUrl(dataUrl);
    const mime = sniffMime(decoded.bytes, decoded.mime);
    if (!allowed.has(mime)) throw new Error("Tipo de arquivo não suportado.");
    if (decoded.bytes.length > max) throw new Error("Arquivo acima do limite permitido.");
    const extension = ext(mime);
    if (!extension) throw new Error("Tipo de arquivo não suportado.");
    const path = Date.now() + "-" + randomBytes(6).toString("hex") + "." + extension;
    const body = decoded.bytes.buffer.slice(decoded.bytes.byteOffset, decoded.bytes.byteOffset + decoded.bytes.byteLength);
    const { error } = await db.storage.from(bucket).upload(path, body, { contentType: mime, cacheControl: "31536000", upsert: false });
    if (error) throw error;
    return { url: db.storage.from(bucket).getPublicUrl(path).data.publicUrl, mime };
  }

  return { profileMap, decodeDataUrl, sniffMime, ext, uploadFile };
}
