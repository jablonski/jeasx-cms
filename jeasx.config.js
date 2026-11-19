// https://www.jeasx.dev/configuration

/** Sent with every response; uploaded files replace the policy with a stricter one. */
const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self'",
    // Blocks and the admin set custom properties in style attributes.
    "style-src 'self' 'unsafe-inline'",
    // Editors may use images and links from other sites.
    "img-src 'self' https: http: data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join("; "),
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
};

export default {
  /** @type {() => import("esbuild").BuildOptions} */
  ESBUILD_SERVER_OPTIONS: () => ({
    alias: { "@cms": "./src/@cms" },
    define: { "process.env.BUILD_ID": `"${Date.now().toString(36)}"` },
    sourcemap: process.env.NODE_ENV === "development" && "inline",
  }),

  /** @type {() => import("esbuild").BuildOptions} */
  ESBUILD_BROWSER_OPTIONS: () => ({
    alias: { "@cms": "./src/@cms" },
    target: ["chrome130", "edge130", "firefox130", "safari18"],
  }),

  /** @type {(fastify: import("fastify").FastifyInstance) => import("fastify").FastifyInstance} */
  FASTIFY_SERVER: (fastify) =>
    // JSON is parsed by Fastify itself; other body types are rejected with 415.
    fastify
      // Details of unexpected errors stay in the server log; visitors get a neutral answer.
      .setErrorHandler((error, request, reply) => {
        const status = error.statusCode ?? 500;
        if (status < 500) {
          return reply.send(error);
        }
        request.log.error({ err: error });
        return reply
          .status(status)
          .type("application/json; charset=utf-8")
          .send({ error: "Internal Server Error" });
      })
      .addHook("onRequest", async (request, reply) => {
        reply.headers(SECURITY_HEADERS);
        if (request.protocol === "https") {
          reply.header("Strict-Transport-Security", "max-age=15552000");
        }
      })
      // Raw file uploads from the admin stay an unread stream here: only the upload route
      // reads them (see src/@cms/api/[files].ts), after the guards have checked the session.
      .addContentTypeParser("application/octet-stream", (_request, payload, done) =>
        done(null, payload),
      )
      // The admin's login form (see src/@cms/[login].tsx).
      .addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string", bodyLimit: 8 * 1024 },
        async (_request, body) => body,
      ),

  /** @type {() => import("fastify").FastifyServerOptions} */
  FASTIFY_SERVER_OPTIONS: () => ({
    logger: { level: process.env.NODE_ENV === "development" ? "error" : "info" },
    // Login attempts are limited per client address, which proxies would otherwise hide.
    // Addresses of the trusted proxies, comma-separated (IPs or CIDR ranges).
    trustProxy: false,
  }),

  /** @type {() => import("@fastify/send").SendOptions} */
  FASTIFY_SEND_OPTIONS: () => ({
    maxAge: process.env.NODE_ENV === "development" ? 0 : "365d",
  }),
};
