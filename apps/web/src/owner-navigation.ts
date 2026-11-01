const destinations = new Set(['/operations', '/customers', '/projects/orbis-maya'])
/** Only known same-origin Admin destinations can be returned to after login. */
export function ownerReturnPath(search: string): string | null {
  const path = new URLSearchParams(search).get('returnTo')
  return path !== null && destinations.has(path) ? path : null
}
export function ownerSignInPath(path: string): string {
  const destination = destinations.has(path) ? path : '/operations'
  return '/account?returnTo=' + encodeURIComponent(destination)
}
