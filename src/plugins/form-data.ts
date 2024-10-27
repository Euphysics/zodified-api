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

export const formDataPlugin = (): ZodifiedPlugin => plugin;
