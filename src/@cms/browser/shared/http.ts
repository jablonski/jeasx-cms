import type { ValidationError } from "@cms/content/fields";
import type { FileUsage } from "@cms/media/files";

export interface ApiSuccess<T> {
  ok: true;
  status: number;
  data: T;
}

export interface ApiFailure {
  ok: false;
  /** HTTP status; 0 if the server could not be reached */
  status: number;
  /** always a readable message */
  error: string;
  /** what is wrong with a page that could not be saved */
  errors?: ValidationError[];
  /** pages using a file that could not be deleted */
  usage?: FileUsage[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

type ResponseFormat = "json" | "text";

/** A failed response; proxies may answer with something other than the API's JSON. */
function failure(status: number, body: unknown): ApiFailure {
  const details: Partial<ApiFailure> =
    body && typeof body === "object" && !Array.isArray(body) ? body : {};
  return {
    ok: false,
    status,
    error: details.error || `Request failed with status ${status}`,
    errors: details.errors,
    usage: details.usage,
  };
}

/**
 * Requests to the admin APIs (browser). Every request carries `x-requested-with`,
 * which the API guard requires for changes (cross-site forms can't set it). Never
 * throws: check `ok` to get either the `data` of type T or the `error`.
 *
 * Responses are parsed as JSON; with `as: "text"` a successful response is returned
 * as text instead (e.g. HTML from the preview), errors are still parsed as JSON.
 */
export async function request<T = unknown>(
  method: string,
  url: string,
  {
    body,
    headers,
    as = "json",
  }: { body?: BodyInit; headers?: Record<string, string>; as?: ResponseFormat } = {},
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method,
      body,
      headers: { "x-requested-with": "JeasxCMS", ...headers },
    });
    if (!res.ok) {
      return failure(res.status, await res.json().catch(() => null));
    }
    const data = as === "text" ? await res.text() : await res.json().catch(() => ({}));
    return { ok: true, status: res.status, data: data as T };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

/**
 * Request with a JSON body. Without data `{}` is sent, as Fastify rejects an empty
 * body declared as JSON. Requests without a body (DELETE) use `request()`.
 */
export const json = <T = unknown>(
  method: string,
  url: string,
  data: unknown = {},
  { as }: { as?: ResponseFormat } = {},
) =>
  request<T>(method, url, {
    body: JSON.stringify(data),
    headers: { "content-type": "application/json" },
    as,
  });
