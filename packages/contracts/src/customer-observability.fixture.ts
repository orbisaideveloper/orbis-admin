export const id = '11111111-1111-7111-8111-111111111111'
const at = '2026-11-01T00:00:00Z'
export const customer = { authUserId: id, orbisIdentityId: id, displayId: 'ORB-U-23456789', name: 'Customer', email: 'a@b.co', phone: null, status: 'active', registeredAt: at, lastSignInAt: at, products: [{ projectId: 'orbis-khata', environment: 'production' }] }
export const event = { id, at, action: 'login', outcome: 'failure', code: 'CUSTOMER_AUTH_FAILED', projectId: null, orbisIdentityId: null, contactHint: null, durationMs: 20 }
export const observationFixture = { version: 'orbis.admin.customers.v1', checkedAt: at, total: 1, unlinked: 0, customers: [customer], nextCursor: null, activity: [event] }
