import type { ZodifiedPlugin } from "@/types";
import { getFormDataStream } from "./utils";

const plugin: ZodifiedPlugin = {
  name: "form-data",
  request: async (_, config) => {
    if (typeof config.body !== "object" || Array.isArray(config.body)) {
      throw new Error("Zodifieds: multipart/form-data body must be an object");
    }
    const result = getFormDataStream(
      config.body as unknown as Record<string, string | Blob>,
    );
    return {
      ...config,
      data: result.data,
      headers: {
        ...config.headers,
      },
    };
  },
};

/**
 * form-data plugin used internally by Zodios.
 * @example
 * ```typescript
 *   const apiClient = new Zodios(
 *     "https://mywebsite.com",
 *     [{
 *       method: "post",
 *       path: "/upload",
 *       alias: "upload",
 *       description: "Upload a file",
 *       requestFormat: "form-data",
 *       parameters:[
 *         {
 *           name: "body",
 *           type: "Body",
 *           schema: z.object({
 *             file: z.instanceof(File),
 *           }),
 *         }
 *       ],
 *       response: z.object({
 *         id: z.number(),
 *       }),
 *     }],
 *   );
 *   const id = await apiClient.upload({ file: document.querySelector('#file').files[0] });
 * ```
 * @returns form-data plugin
 */
export const formDataPlugin = (): ZodifiedPlugin => plugin;
