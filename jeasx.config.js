// https://www.jeasx.dev/configuration

export default {
  /** @type {() => import("esbuild").BuildOptions} */
  ESBUILD_SERVER_OPTIONS: () => ({
    alias: { "@cms": "./src/@cms" },
    define: { "process.env.BUILD_ID": `"${Date.now().toString(36)}"` },
  }),

  /** @type {() => import("esbuild").BuildOptions} */
  ESBUILD_BROWSER_OPTIONS: () => ({
    alias: { "@cms": "./src/@cms" },
  }),

  /** @type {(fastify: import("fastify").FastifyInstance) => import("fastify").FastifyInstance} */
  FASTIFY_SERVER: (fastify) =>
    fastify
      .addContentTypeParser("application/octet-stream", async (_request, payload) => payload)
      .addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string", bodyLimit: 8 * 1024 },
        async (_request, body) => body,
      ),

  /** @type {() => import("fastify").FastifyServerOptions} */
  FASTIFY_SERVER_OPTIONS: () => ({
    logger: { level: process.env.NODE_ENV === "development" ? "error" : "info" },
    trustProxy: false,
  }),

  /** @type {() => import("@fastify/send").SendOptions} */
  FASTIFY_SEND_OPTIONS: () => ({
    maxAge: process.env.NODE_ENV === "development" ? 0 : "365d",
  }),
};
