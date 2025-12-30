import type { ZodifiedPlugin } from "#core/types/zodified";

export const headerPlugin = (key: string, value: string): ZodifiedPlugin => ({
  request: async (_, config) => ({
    ...config,
    headers: {
      ...config.headers,
      [key]: value,
    },
  }),
});
