export function createAuthContext({ userFromToken, expireLucca, luccaToken, expireYcaro, ycaroToken }) {
  async function contextName(req) {
    const normal = await userFromToken(req);
    if (normal) return { name: normal, guest: false, joinedAt: 0 };
    const lucca = await expireLucca();
    const luccaSessionToken = luccaToken(req);
    if (luccaSessionToken && lucca.online && lucca.session === luccaSessionToken) {
      return { name: "Lucca", guest: true, joinedAt: Date.parse(String(lucca.joinedAt)) || Date.now() };
    }
    const ycaro = await expireYcaro();
    const ycaroSessionToken = ycaroToken(req);
    if (ycaroSessionToken && ycaro.online && ycaro.session === ycaroSessionToken) {
      return { name: "Ycaro", guest: true, joinedAt: Date.parse(String(ycaro.joinedAt)) || Date.now() };
    }
    return null;
  }

  return { contextName };
}
