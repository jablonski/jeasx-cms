/**
 * Jeasx bundles every route separately, each with its own copy of the core modules.
 * State all routes must see lives in one object on globalThis, created by the first copy.
 * Free of Node.js imports: the registry also runs in the admin's browser code.
 */
export function shared<T extends object>(key: string, create: () => T): T {
  const store = globalThis as unknown as Record<string, T | undefined>;
  store[key] ??= create();
  return store[key];
}
