const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDENTITY = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function decideAccess(body, sourceProjectId, lookup) {
  const keys = ["version", "sourceProjectId", "authIssuer", "userId", "projectId", "capability"];
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== keys.length ||
      !keys.every(key => Object.hasOwn(body, key)) || body.version !== "maya.access.v1" ||
      typeof sourceProjectId !== "string" || !sourceProjectId || body.sourceProjectId !== sourceProjectId ||
      !UUID.test(body.userId) || body.projectId !== "orbis-maya" ||
      !["general.chat", "dream.analysis", "astro.interpretation"].includes(body.capability)) return null;
  try {
    const issuer = new URL(body.authIssuer);
    if (issuer.protocol !== "https:" || issuer.origin !== body.authIssuer) return null;
  } catch { return null; }
  const identities = await lookup(body);
  const allowed = Array.isArray(identities) && identities.length === 1 && IDENTITY.test(identities[0]);
  return { version: "maya.access.v1", authIssuer: body.authIssuer, userId: body.userId,
    projectId: body.projectId, capability: body.capability, allowed,
    ...(allowed ? { orbisIdentityId: identities[0] } : {}) };
}
