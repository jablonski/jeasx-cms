import { PAGE_TYPES } from "@cms/shared/blocks";
import { bodyOf, dispatch, fail, jsonOnly } from "@cms/core/http";
import type { RouteProps } from "@cms/core/types";
import { renderCanvas } from "@cms/render/render-canvas";

/**
 * Renders a draft for the editor canvas (block components run on the server only).
 *   POST /@cms/api/preview   JSON { page: { type, blocks }, editable }   → HTML
 *
 * Requires a JSON body; the "x-requested-with" header is checked by the API guard.
 */
export default function ({ request, reply }: RouteProps) {
  const json = jsonOnly(request, reply);

  return dispatch(request, reply, {
    POST: json(async () => {
      const { page, editable } = bodyOf(request);
      const draft = page as { type?: unknown; blocks?: unknown } | null | undefined;
      const type = typeof draft?.type === "string" ? draft.type : "";
      if (!PAGE_TYPES[type]) {
        return fail(reply, 422, "Unknown page type");
      }

      const html = await renderCanvas(
        { type, blocks: draft?.blocks },
        editable === "plaintext-only" ? "plaintext-only" : "true",
        { request, reply },
      );
      return reply.type("text/html; charset=utf-8").header("Cache-Control", "no-store").send(html);
    }),
  });
}
