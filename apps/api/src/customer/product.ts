import { CustomerError } from './error.js'

export const customerProducts = ['orbis-foundation', 'orbis-maya', 'orbis-khata'] as const
export const customerEnvironments = ['production', 'staging', 'development'] as const
export type CustomerProduct = typeof customerProducts[number]
export type CustomerEnvironment = typeof customerEnvironments[number]
export function productScope(project: string, environment: string): { projectId: CustomerProduct; environment: CustomerEnvironment } {
  const projectId = customerProducts.find(value => value === project)
  const selectedEnvironment = customerEnvironments.find(value => value === environment)
  if (!projectId || !selectedEnvironment) throw new CustomerError(400, 'CUSTOMER_PRODUCT_INVALID')
  return { projectId, environment: selectedEnvironment }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export function productBinding(value: unknown, expected: { projectId: CustomerProduct; environment: CustomerEnvironment; orbisIdentityId: string }) {
  if (value === null) throw new CustomerError(409, 'CUSTOMER_PRODUCT_NOT_LINKED')
  if (!value || typeof value !== 'object' || !('projectId' in value) || !('environment' in value) ||
      !('orbisIdentityId' in value) || !('localAuthUserId' in value) || !('localAccountId' in value) ||
      value.projectId !== expected.projectId || value.environment !== expected.environment ||
      value.orbisIdentityId !== expected.orbisIdentityId || typeof value.localAuthUserId !== 'string' || !uuid.test(value.localAuthUserId) ||
      !(value.localAccountId === null || (typeof value.localAccountId === 'string' && uuid.test(value.localAccountId)))) {
    throw new CustomerError(503, 'CUSTOMER_PRODUCT_BINDING_INVALID')
  }
  return { version: 'orbis.customer.product.v1', ...expected, localAuthUserId: value.localAuthUserId, localAccountId: value.localAccountId }
}
