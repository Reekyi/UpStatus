import { BACKEND_HEX } from "./backend_v25_bundle.ts";

const bytes = new Uint8Array(BACKEND_HEX.length / 2);
for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(BACKEND_HEX.slice(i * 2, i * 2 + 2), 16);
const source = new TextDecoder().decode(bytes);
await import("data:text/javascript;charset=utf-8," + encodeURIComponent(source));
