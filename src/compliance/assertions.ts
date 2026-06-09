// PURE compliance assertion helpers (Shared Contracts §6.3). M4 extends this file
// with manifestExcludesAdId() and hasNoForbiddenSdks().

/** True if a capacitor.config object has NO server.url (bundled assets only). */
export function hasNoServerUrl(config: Record<string, unknown>): boolean {
  const server = config['server'];
  if (server === undefined || server === null) return true;
  if (typeof server !== 'object') return true;
  return !('url' in (server as Record<string, unknown>));
}
