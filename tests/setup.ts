// Vitest global setup: assert tests perform no network I/O.
// Pure modules under test never fetch; this catches accidental network use.
globalThis.fetch = (() => {
  throw new Error('Network access is forbidden in unit tests (no fetch).');
}) as typeof fetch;
