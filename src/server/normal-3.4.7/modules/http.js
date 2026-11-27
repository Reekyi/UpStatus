export function createHttpHelpers(cors) {
  function response(body, status = 200, extra = {}) {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...cors,
        ...extra
      }
    });
  }

  async function readBody(req) {
    const raw = await req.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("Pedido inválido.");
    }
  }

  return { response, readBody };
}
