import { ApiError, NetworkError } from "@/error";
import type {
  ApiConfig,
  ApiEndpoint,
  ApiEndpointKey,
  ApiEndpointRequestBodyType,
  ApiEndpointRequestQueryType,
  ApiEndpointResponseBodyType,
} from "@/types";

interface ApiClientOptions {
  baseUrl: string;
  headers?: Record<string, string>;
  onUnauthorized?: () => void;
  retryConfig?: {
    count: number;
    delay: number;
  };
}

export class ApiClient<C extends ApiConfig<Record<string, ApiEndpoint>>> {
  private options: Required<ApiClientOptions>;

  constructor(
    private config: C,
    options: ApiClientOptions,
  ) {
    this.options = {
      ...options,
      headers: options.headers ?? {},
      onUnauthorized: options.onUnauthorized ?? (() => {}),
      retryConfig: options.retryConfig ?? { count: 3, delay: 1000 },
    };
  }

  private async getHeaders(endpoint: ApiEndpoint): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...this.options.headers,
      ...endpoint.headers,
    };

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      if (response.status === 401 && this.options.onUnauthorized) {
        this.options.onUnauthorized();
      }
      throw new ApiError(response.status, "An error occurred");
    }
    return await response.json();
  }

  private async retryFetch(
    url: string,
    options: RequestInit,
    retries: number,
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      if (
        !response.ok &&
        response.status >= 500 &&
        response.status < 600 &&
        retries > 0
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.retryConfig.delay),
        );
        return this.retryFetch(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.retryConfig.delay),
        );
        return this.retryFetch(url, options, retries - 1);
      }
      throw new NetworkError("Network error occurred");
    }
  }

  async request<T extends ApiEndpointKey<C>>(
    endpointKey: T,
    request?: {
      query?: ApiEndpointRequestQueryType<C, T>;
      body?: ApiEndpointRequestBodyType<C, T>;
    },
  ): Promise<ApiEndpointResponseBodyType<C, T>> {
    const endpoint = this.config.endpoints[endpointKey as string];
    let url = `${this.options.baseUrl}${this.config.baseUrl}${endpoint.url}`;

    const headers = await this.getHeaders(endpoint);

    const options: RequestInit = {
      method: endpoint.method,
      headers,
    };

    if (request) {
      const { query, body } = request;
      if (query) {
        const params = new URLSearchParams(query as Record<string, string>);
        url = `${url}?${params.toString()}`;
      }
      if (body) {
        options.body = JSON.stringify(body);
      }
    }

    try {
      const response = await this.retryFetch(
        url,
        options,
        this.options.retryConfig.count,
      );
      return await this.handleResponse<ApiEndpointResponseBodyType<C, T>>(
        response,
      );
    } catch (error) {
      if (error instanceof ApiError || error instanceof NetworkError) {
        throw error;
      }
      throw new NetworkError("An unexpected error occurred");
    }
  }
}
