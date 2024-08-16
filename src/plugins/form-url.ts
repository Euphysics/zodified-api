import type { ZodifiedPlugin } from "@/types";

const plugin: ZodifiedPlugin = {
  name: "form-url",
  request: async (_, config) => {
    if (typeof config.body !== "object" || Array.isArray(config.body)) {
      throw new Error(
        "Zodified: application/x-www-form-urlencoded body must be an object",
      );
    }

    return {
      ...config,
      data: new URLSearchParams(
        config.body as unknown as Record<string, string>,
      ).toString(),
      headers: {
        ...config.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    };
  },
};

/**
 * form-url plugin used internally by Zodified.
 * @example
 * ```typescript
 *   const apiClient = new Zodified(
 *     "https://mywebsite.com",
 *     [{
 *       method: "post",
 *       path: "/login",
 *       alias: "login",
 *       description: "Submit a form",
 *       requestFormat: "form-url",
 *       parameters:[
 *         {
 *           name: "body",
 *           type: "Body",
 *           schema: z.object({
 *             userName: z.string(),
 *             password: z.string(),
 *           }),
 *         }
 *       ],
 *       response: z.object({
 *         id: z.number(),
 *       }),
 *     }],
 *   );
 *   const id = await apiClient.login({ userName: "user", password: "password" });
 * ```
 * @returns form-url plugin
 */
export const formURLPlugin = (): ZodifiedPlugin => plugin;
