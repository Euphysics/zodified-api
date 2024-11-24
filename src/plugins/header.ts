import type { ZodifiedPlugin } from "@/types/zodified";

export const headerPlugin = (key: string, value: string): ZodifiedPlugin => ({
  request: async (_, config) => ({
    ...config,
    headers: {
      ...config.headers,
      [key]: value,
    },
  }),
});
