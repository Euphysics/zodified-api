import type {
  Method,
  MockData,
  MockEndpointData,
  ZodifiedEndpointDefinitions,
  ZodifiedPathsByMethod,
  ZodifiedPlugin,
  ZodifiedResponse,
} from "@/types/zodified";

export const mockPlugin = <Api extends ZodifiedEndpointDefinitions>(
  mockData: MockData<Api>,
  delay = 0,
): ZodifiedPlugin => {
  return {
    name: "mockPlugin",
    async request(_, config) {
      const method = config.method as Method;
      const path = config.url as ZodifiedPathsByMethod<Api, typeof method>;

      const endpointMockData = (
        mockData[method] as
          | Record<string, MockEndpointData<Api, Method, string>>
          | undefined
      )?.[path];

      if (endpointMockData) {
        // simulate delay
        if (
          delay > 0 ||
          (endpointMockData.delay && endpointMockData.delay > 0)
        ) {
          await new Promise((resolve) =>
            setTimeout(resolve, endpointMockData.delay || delay),
          );
        }

        // get response from function or object
        const response =
          typeof endpointMockData.response === "function"
            ? // @ts-expect-error: response is a function
              endpointMockData.response()
            : endpointMockData.response;

        // return mock response
        return {
          ...config,
          mockResponse: new Response(JSON.stringify(response), {
            status: endpointMockData.status || 200,
            headers: {
              "Content-Type": "application/json",
              ...endpointMockData.headers,
            },
          }) as ZodifiedResponse,
        };
      }

      return config;
    },

    async response(_, config, response) {
      if (config.mockResponse) {
        return config.mockResponse;
      }
      return response;
    },
  };
};
