/**
 * Limits failed sign-ins (server only, kept in memory), per client address and per
 * account. The higher account limit stops guessing from many addresses, while a single
 * client can't lock an account out as quickly as it locks itself out.
 */
import { shared } from "@cms/shared/global";

const MAX_CLIENT_FAILURES = 5;
const MAX_ACCOUNT_FAILURES = 20;
const LOCK_MS = 15 * 60 * 1000;
const MAX_TRACKED = 2000;

/** Shared by all route bundles: sign-ins and password confirmations count towards one limit. */
const failures = shared(
  "__cmsLoginFailures",
  () => new Map<string, { count: number; resetAt: number }>(),
);

/** IPv6 clients usually control a whole /64 network, so it counts as one address. */
function clientKey(ip: string) {
  const isIpv4 = !ip.includes(":") || ip.toLowerCase().startsWith("::ffff:");
  if (isIpv4) {
    return ip;
  }
  // Expands "::" to get all 8 groups, of which the first 4 name the network.
  const [head, tail = ""] = ip.split("%")[0].toLowerCase().split("::");
  const start = head ? head.split(":") : [];
  const end = tail ? tail.split(":") : [];
  const zeros = Array(Math.max(0, 8 - start.length - end.length)).fill("0");
  return [...start, ...zeros, ...end]
    .slice(0, 4)
    .map((group) => group.replace(/^0+(?=.)/, ""))
    .join(":");
}

const clientEntry = (ip: string) => `client:${clientKey(ip)}`;
const accountEntry = (username: string) => `account:${username.toLowerCase().slice(0, 80)}`;

const limits = (ip: string, username: string): [string, number][] => [
  [clientEntry(ip), MAX_CLIENT_FAILURES],
  [accountEntry(username), MAX_ACCOUNT_FAILURES],
];

/** Seconds until this sign-in may be tried again; 0 if it isn't locked. */
export function lockedSeconds(ip: string, username: string) {
  let seconds = 0;
  for (const [key, limit] of limits(ip, username)) {
    const entry = failures.get(key);
    if (!entry) {
      continue;
    }
    const remaining = entry.resetAt - Date.now();
    if (remaining <= 0) {
      failures.delete(key);
    } else if (entry.count >= limit) {
      seconds = Math.max(seconds, Math.ceil(remaining / 1000));
    }
  }
  return seconds;
}

/** Makes room by forgetting expired entries, else the one with the fewest failures. */
function evict(time: number) {
  for (const [key, entry] of failures) {
    if (entry.resetAt <= time) {
      failures.delete(key);
    }
  }
  if (failures.size < MAX_TRACKED) {
    return;
  }
  const [fewest] = [...failures].reduce((a, b) => (b[1].count < a[1].count ? b : a));
  failures.delete(fewest);
}

export function recordFailure(ip: string, username: string) {
  const time = Date.now();
  for (const [key] of limits(ip, username)) {
    if (failures.size >= MAX_TRACKED) {
      evict(time);
    }
    const entry = failures.get(key);
    if (entry && entry.resetAt > time) {
      entry.count++;
    } else {
      failures.set(key, { count: 1, resetAt: time + LOCK_MS });
    }
  }
}

/**
 * The password was correct: the account's failures are forgotten, but the client only gets
 * this attempt back. Signing in to an own account must not reset guesses at other accounts.
 */
export function recordSuccess(ip: string, username: string) {
  failures.delete(accountEntry(username));
  const key = clientEntry(ip);
  const client = failures.get(key);
  if (client && --client.count <= 0) {
    failures.delete(key);
  }
}

type Attempt<T> =
  | { outcome: "locked"; retryAfter: number }
  | { outcome: "failed" }
  | { outcome: "ok"; value: T };

/**
 * Checks credentials within the limits. The failure is counted up front, so parallel
 * attempts can't get past the limit while the password is being hashed.
 * @param verify resolves a truthy value if the credentials are correct
 */
export async function limitedAttempt<T>(
  ip: string,
  username: string,
  verify: () => Promise<T>,
): Promise<Attempt<NonNullable<T>>> {
  const retryAfter = lockedSeconds(ip, username);
  if (retryAfter > 0) {
    return { outcome: "locked", retryAfter };
  }
  recordFailure(ip, username);
  const value = await verify();
  if (!value) {
    return { outcome: "failed" };
  }
  recordSuccess(ip, username);
  return { outcome: "ok", value };
}
