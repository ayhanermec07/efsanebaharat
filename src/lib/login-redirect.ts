const fixedPaths = new Set(['/sepet', '/hesabim', '/bize-ulasin', '/sorularim'])
const productPath = /^\/urun\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function loginDestination(queryPath: unknown, statePath: unknown): string {
  const path = queryPath || statePath
  if (typeof path === 'string' && (fixedPaths.has(path) || productPath.test(path))) return path
  return '/'
}
