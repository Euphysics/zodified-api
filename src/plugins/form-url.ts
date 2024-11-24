import type { ZodifiedPlugin } from "@/types/zodified";

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

export const formURLPlugin = (): ZodifiedPlugin => plugin;
