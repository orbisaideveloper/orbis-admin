export const publicOwnerAuthConfig = () => {
  const origin = process.env.ORBIS_ADMIN_SUPABASE_URL ?? ''
  const publishableKey = process.env.ORBIS_ADMIN_SUPABASE_PUBLISHABLE_KEY ?? ''
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)) return null
  if (publishableKey.startsWith('sb_publishable_')) return { origin, publishableKey }
  // Legacy compatibility: never serialize a service_role JWT to browser code.
  try {
    const payload: unknown = JSON.parse(Buffer.from(publishableKey.split('.')[1], 'base64url').toString())
    if (payload && typeof payload === 'object' && 'role' in payload && payload.role === 'anon') {
      return { origin, publishableKey }
    }
  } catch { /* Missing or malformed public credentials disable login. */ }
  return null
}
