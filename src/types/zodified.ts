import type { z } from "zod";
import type {
  FilterArrayByKey,
  FilterArrayByValue,
  IfEquals,
  MapSchemaParameters,
  Merge,
  NeverIfEmpty,
  PathParamNames,
  PickDefined,
  ReadonlyDeep,
  RequiredKeys,
  SetPropsOptionalIfChildrenAreOptional,
  Simplify,
  UndefinedIfNever,
  UndefinedToOptional,
} from "./utils";

// Fetch RequestConfig Type
export interface FetchRequestConfig extends RequestInit {
  baseURL?: string;
  params?: Record<string, string | number | boolean>;
  headers?: Record<string, string>;
  responseType?: "json" | "text" | "blob" | "arrayBuffer";
}

export type ZodifiedResponse = Response & {
  parsedBody: unknown;
};

export type MutationMethod = "post" | "put" | "patch" | "delete";

export type Method = "get" | "head" | "options" | MutationMethod;

export type RequestFormat =
  | "json" // default
  | "form-data" // for file uploads
  | "form-url" // for hiding query params in the body
  | "binary" // for binary data / file uploads
  | "text"; // for text data

export type AuthConfig = {
  /**
   * Whether the endpoint requires a session
   *
   * the default is `true`
   */
  requireSession?: boolean;
  /**
   * Whether the endpoint requires a user.
   * If true, the endpoint requires basic authentication.
   *
   * the default is `false`
   */
  requireUser?: boolean;
  /**
   * Optional roles required to access the endpoint
   *
   * the default is `[]`
   */
  roles?: string[];
  /**
   * Optional permissions required to access the endpoint
   *
   * the default is `[]`
   */
  permissions?: string[];
};

type EndpointDefinitionsByMethod<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
> = FilterArrayByValue<Api, { method: M }>;

export type ZodifiedEndpointDefinitionByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = FilterArrayByValue<Api, { method: M; path: Path }>;

export type ZodifiedEndpointDefinitionByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
> = FilterArrayByValue<Api, { alias: Alias }>;

export type ZodifiedPathsByMethod<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
> = EndpointDefinitionsByMethod<Api, M>[number]["path"];

export type Aliases<Api extends ZodifiedEndpointDefinition[]> =
  FilterArrayByKey<Api, "alias">[number]["alias"];

export type ZodifiedResponseForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<Endpoint["response"]>
  : z.input<Endpoint["response"]>;

export type ZodifiedResponseByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["response"]>
  : z.input<ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["response"]>;

export type ZodifiedResponseByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["response"]>
  : z.input<ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["response"]>;

export type ZodifiedDefaultErrorForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
> = FilterArrayByValue<
  Endpoint["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type ZodifiedDefaultErrorByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = FilterArrayByValue<
  ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type ZodifiedDefaultErrorByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
> = FilterArrayByValue<
  ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["errors"],
  {
    status: "default";
  }
>[number]["schema"];

type IfNever<E, A> = IfEquals<E, never, A, E>;

export type ZodifiedErrorForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Status extends number,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<
      IfNever<
        FilterArrayByValue<
          Endpoint["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorForEndpoint<Endpoint>
      >
    >
  : z.input<
      IfNever<
        FilterArrayByValue<
          Endpoint["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorForEndpoint<Endpoint>
      >
    >;

export type ZodifiedErrorByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Status extends number,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<
      IfNever<
        FilterArrayByValue<
          ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorByPath<Api, M, Path>
      >
    >
  : z.input<
      IfNever<
        FilterArrayByValue<
          ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorByPath<Api, M, Path>
      >
    >;

export type ErrorsToFetch<T, Acc extends unknown[] = []> = T extends [
  infer Head,
  ...infer Tail,
]
  ? Head extends {
      status: infer Status;
      schema: infer Schema;
    }
    ? Schema extends z.ZodTypeAny
      ? ErrorsToFetch<
          Tail,
          [
            ...Acc,
            {
              status: Status extends "default" ? 0 & { error: Status } : Status;
              response: z.output<Schema>;
            },
          ]
        >
      : ErrorsToFetch<Tail, Acc>
    : ErrorsToFetch<Tail, Acc>
  : Acc;

export type ZodifiedMatchingErrorsByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = ErrorsToFetch<
  ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["errors"]
>[number];

export type ZodifiedMatchingErrorsByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
> = ErrorsToFetch<
  ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["errors"]
>[number];

export type ZodifiedErrorByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Status extends number,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.output<
      IfNever<
        FilterArrayByValue<
          ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorByAlias<Api, Alias>
      >
    >
  : z.input<
      IfNever<
        FilterArrayByValue<
          ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["errors"],
          {
            status: Status;
          }
        >[number]["schema"],
        ZodifiedDefaultErrorByAlias<Api, Alias>
      >
    >;

export type BodySchemaForEndpoint<Endpoint extends ZodifiedEndpointDefinition> =
  FilterArrayByValue<
    Endpoint["parameters"],
    { type: "Body" }
  >[number]["schema"];

export type BodySchema<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = FilterArrayByValue<
  ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["parameters"],
  { type: "Body" }
>[number]["schema"];

export type ZodifiedBodyForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.input<BodySchemaForEndpoint<Endpoint>>
  : z.output<BodySchemaForEndpoint<Endpoint>>;

export type ZodifiedBodyByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.input<BodySchema<Api, M, Path>>
  : z.output<BodySchema<Api, M, Path>>;

export type BodySchemaByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
> = FilterArrayByValue<
  ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["parameters"],
  { type: "Body" }
>[number]["schema"];

export type ZodifiedBodyByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
> = Frontend extends true
  ? z.input<BodySchemaByAlias<Api, Alias>>
  : z.output<BodySchemaByAlias<Api, Alias>>;

export type ZodifiedQueryParamsForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<Endpoint["parameters"], { type: "Query" }>,
      Frontend
    >
  >
>;

export type ZodifiedQueryParamsByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["parameters"],
        { type: "Query" }
      >,
      Frontend
    >
  >
>;

export type ZodifiedQueryParamsByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["parameters"],
        { type: "Query" }
      >,
      Frontend
    >
  >
>;

/**
 * @deprecated - use ZodifiedQueryParamsByPath instead
 */
export type ZodifiedPathParams<Path extends string> = NeverIfEmpty<
  Record<PathParamNames<Path>, string | number>
>;

export type ZodifiedPathParamsForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Frontend extends boolean = true,
  PathParameters = UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<Endpoint["parameters"], { type: "Path" }>,
      Frontend
    >
  >,
> = NeverIfEmpty<
  Simplify<
    Omit<
      {
        [K in PathParamNames<Endpoint["path"]>]: string | number | boolean;
      },
      keyof PathParameters
    > &
      PathParameters
  >
>;

/**
 * Get path params for a given endpoint by path
 */
export type ZodifiedPathParamsByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Frontend extends boolean = true,
  PathParameters = UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["parameters"],
        { type: "Path" }
      >,
      Frontend
    >
  >,
  $PathParamNames extends string = PathParamNames<Path>,
> = NeverIfEmpty<
  Simplify<
    Omit<
      {
        [K in $PathParamNames]: string | number | boolean;
      },
      keyof PathParameters
    > &
      PathParameters
  >
>;

/**
 * Get path params for a given endpoint by alias
 */
export type ZodifiedPathParamByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
  EndpointDefinition extends
    ZodifiedEndpointDefinition = ZodifiedEndpointDefinitionByAlias<
    Api,
    Alias
  >[number],
  Path = EndpointDefinition["path"],
  PathParameters = UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<EndpointDefinition["parameters"], { type: "Path" }>,
      Frontend
    >
  >,
  $PathParamNames extends string = PathParamNames<Path>,
> = NeverIfEmpty<
  Simplify<
    Omit<
      {
        [K in $PathParamNames]: string | number | boolean;
      },
      keyof PathParameters
    > &
      PathParameters
  >
>;

export type ZodifiedHeaderParamsForEndpoint<
  Endpoint extends ZodifiedEndpointDefinition,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<Endpoint["parameters"], { type: "Header" }>,
      Frontend
    >
  >
>;

export type ZodifiedHeaderParamsByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        ZodifiedEndpointDefinitionByPath<Api, M, Path>[number]["parameters"],
        { type: "Header" }
      >,
      Frontend
    >
  >
>;

export type ZodifiedHeaderParamsByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
  Frontend extends boolean = true,
> = NeverIfEmpty<
  UndefinedToOptional<
    MapSchemaParameters<
      FilterArrayByValue<
        ZodifiedEndpointDefinitionByAlias<Api, Alias>[number]["parameters"],
        { type: "Header" }
      >,
      Frontend
    >
  >
>;

export type ZodifiedRequestOptionsByAlias<
  Api extends ZodifiedEndpointDefinition[],
  Alias extends string,
> = Merge<
  SetPropsOptionalIfChildrenAreOptional<
    PickDefined<{
      params: ZodifiedPathParamByAlias<Api, Alias>;
      queries: ZodifiedQueryParamsByAlias<Api, Alias>;
      headers: ZodifiedHeaderParamsByAlias<Api, Alias>;
    }>
  >,
  Omit<FetchRequestConfig, "params" | "baseURL" | "body" | "method" | "url">
>;

export type ZodifiedMutationAliasRequest<Body, Config, ZodifiedResponse> =
  RequiredKeys<Config> extends never
    ? (
        body: ReadonlyDeep<UndefinedIfNever<Body>>,
        configOptions?: ReadonlyDeep<Config>,
      ) => Promise<ZodifiedResponse>
    : (
        body: ReadonlyDeep<UndefinedIfNever<Body>>,
        configOptions: ReadonlyDeep<Config>,
      ) => Promise<ZodifiedResponse>;

export type ZodifiedAliasRequest<Config, ZodifiedResponse> =
  RequiredKeys<Config> extends never
    ? (configOptions?: ReadonlyDeep<Config>) => Promise<ZodifiedResponse>
    : (configOptions: ReadonlyDeep<Config>) => Promise<ZodifiedResponse>;

export type ZodifiedAliases<Api extends ZodifiedEndpointDefinition[]> = {
  [Alias in Aliases<Api>]: ZodifiedEndpointDefinitionByAlias<
    Api,
    Alias
  >[number]["method"] extends MutationMethod
    ? ZodifiedMutationAliasRequest<
        ZodifiedBodyByAlias<Api, Alias>,
        ZodifiedRequestOptionsByAlias<Api, Alias>,
        ZodifiedResponseByAlias<Api, Alias>
      >
    : ZodifiedAliasRequest<
        ZodifiedRequestOptionsByAlias<Api, Alias>,
        ZodifiedResponseByAlias<Api, Alias>
      >;
};

export type AnyZodifiedMethodOptions = Merge<
  {
    params?: Record<string, unknown>;
    queries?: Record<string, unknown>;
    headers?: Record<string, string>;
  },
  Omit<FetchRequestConfig, "params" | "headers" | "url" | "method">
>;

export type AnyZodifiedRequestOptions = Merge<
  { method: Method; url: string; mockResponse?: ZodifiedResponse },
  AnyZodifiedMethodOptions
>;

/**
 * @deprecated - use ZodifiedRequestOptionsByPath instead
 */
export type ZodifiedMethodOptions<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = Merge<
  SetPropsOptionalIfChildrenAreOptional<
    PickDefined<{
      params: ZodifiedPathParamsByPath<Api, M, Path>;
      queries: ZodifiedQueryParamsByPath<Api, M, Path>;
      headers: ZodifiedHeaderParamsByPath<Api, M, Path>;
    }>
  >,
  Omit<FetchRequestConfig, "params" | "baseURL" | "body" | "method" | "url">
>;

/**
 * Get the request options for a given endpoint
 */
export type ZodifiedRequestOptionsByPath<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = Merge<
  SetPropsOptionalIfChildrenAreOptional<
    PickDefined<{
      params: ZodifiedPathParamsByPath<Api, M, Path>;
      queries: ZodifiedQueryParamsByPath<Api, M, Path>;
      headers: ZodifiedHeaderParamsByPath<Api, M, Path>;
    }>
  >,
  Omit<FetchRequestConfig, "params" | "baseURL" | "body" | "method" | "url">
>;

export type ZodifiedRequestOptions<
  Api extends ZodifiedEndpointDefinition[],
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = Merge<
  {
    method: M;
    url: Path;
    body?: ZodifiedBodyByPath<Api, M, Path>;
  },
  ZodifiedRequestOptionsByPath<Api, M, Path>
>;

/**
 * Zodified options
 */
export type ZodifiedOptions = {
  /**
   * Should zodified validate parameters and response? Default: true
   */
  validate?: boolean | "request" | "response" | "all" | "none";
  /**
   * Should zodified transform the request and response ? Default: true
   */
  transform?: boolean | "request" | "response";
  /**
   * Should zod schema default values be used on parameters? Default: false
   * you usually want your backend to handle default values
   */
  sendDefaults?: boolean;
  /**
   * default config for fetch requests
   */
  fetchConfig?: FetchRequestConfig;
};

export type ZodifiedEndpointParameter<T = unknown> = {
  /**
   * name of the parameter
   */
  name: string;
  /**
   * optional description of the parameter
   */
  description?: string;
  /**
   * type of the parameter: Query, Body, Header, Path
   */
  type: "Query" | "Body" | "Header" | "Path";
  /**
   * zod schema of the parameter
   * you can use zod `transform` to transform the value of the parameter before sending it to the server
   */
  schema: z.ZodType<T>;
};

export type ZodifiedEndpointParameters = ZodifiedEndpointParameter[];

export type ZodifiedEndpointError<T = unknown> = {
  /**
   * status code of the error
   * use 'default' to declare a default error
   */
  status: number | "default";
  /**
   * description of the error - used to generate the openapi error description
   */
  description?: string;
  /**
   * schema of the error
   */
  schema: z.ZodType<T>;
};

export type ZodifiedEndpointErrors = ZodifiedEndpointError[];

/**
 * Zodified enpoint definition that should be used to create a new instance of Zodified
 */
export interface ZodifiedEndpointDefinition<R = unknown> {
  /**
   * http method : get, post, put, patch, delete
   */
  method: Method;
  /**
   * path of the endpoint
   * @example
   * ```text
   * /posts/:postId/comments/:commentId
   * ```
   */
  path: string;
  /**
   * optional alias to call the endpoint easily
   * @example
   * ```text
   * getPostComments
   * ```
   */
  alias?: string;
  /**
   * optional description of the endpoint
   */
  description?: string;
  /**
   * optional request format of the endpoint: json, form-data, form-url, binary, text
   */
  requestFormat?: RequestFormat;
  /**
   * optionally mark the endpoint as immutable to allow zodified to cache the response with react-query
   * use it to mark a 'post' endpoint as immutable
   */
  immutable?: boolean;
  /**
   * optional parameters of the endpoint
   */
  parameters?: Array<ZodifiedEndpointParameter>;
  /**
   * response of the endpoint
   * you can use zod `transform` to transform the value of the response before returning it
   */
  response: z.ZodType<R>;
  /**
   * optional response status of the endpoint for sucess, default is 200
   * customize it if your endpoint returns a different status code and if you need openapi to generate the correct status code
   */
  status?: number;
  /**
   * optional response description of the endpoint
   */
  responseDescription?: string;
  /**
   * optional errors of the endpoint - only usefull when using @zodified/express
   */
  errors?: Array<ZodifiedEndpointError>;
  /**
   * optional auth configuration
   *
   * NOTE: this is not used by `@zodified-api/core` but can be used by server implementations
   */
  auth?: AuthConfig;
}

export type ZodifiedEndpointDefinitions = ZodifiedEndpointDefinition[];

/**
 * Zodified plugin that can be used to intercept zodified requests and responses
 */
export type ZodifiedPlugin = {
  /**
   * Optional name of the plugin
   * naming a plugin allows to remove it or replace it later
   */
  name?: string;
  /**
   * request interceptor to modify or inspect the request before it is sent
   * @param api - the api description
   * @param request - the request config
   * @returns possibly a new request config
   */
  request?: (
    api: ZodifiedEndpointDefinitions,
    config: ReadonlyDeep<AnyZodifiedRequestOptions>,
  ) => Promise<ReadonlyDeep<AnyZodifiedRequestOptions>>;
  /**
   * response interceptor to modify or inspect the response before it is returned
   * @param api - the api description
   * @param config - the request config
   * @param response - the response
   * @returns possibly a new response
   */
  response?: (
    api: ZodifiedEndpointDefinitions,
    config: ReadonlyDeep<AnyZodifiedRequestOptions>,
    response: ZodifiedResponse,
  ) => Promise<ZodifiedResponse>;
  /**
   * error interceptor for response errors
   * there is no error interceptor for request errors
   * @param api - the api description
   * @param config - the config for the request
   * @param error - the error that occured
   * @returns possibly a new response or a new error
   */
  error?: (
    api: ZodifiedEndpointDefinitions,
    config: ReadonlyDeep<AnyZodifiedRequestOptions>,
    error: Error,
  ) => Promise<ZodifiedResponse>;
};

export type MockData<Api extends ZodifiedEndpointDefinitions> = {
  [M in Method]?: {
    [Path in ZodifiedPathsByMethod<Api, M>]?: MockEndpointData<Api, M, Path>;
  };
};

export type MockEndpointData<
  Api extends ZodifiedEndpointDefinitions,
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
> = {
  response:
    | ZodifiedResponseByPath<Api, M, Path, true>
    | (() => ZodifiedResponseByPath<Api, M, Path, true>);
  status?: number; // default is 200
  delay?: number;
  body?: UndefinedIfNever<ZodifiedBodyByPath<Api, M, Path>>;
  params?: UndefinedIfNever<ZodifiedPathParamsByPath<Api, M, Path>>;
  queries?: UndefinedIfNever<ZodifiedQueryParamsByPath<Api, M, Path>>;
  headers?: UndefinedIfNever<ZodifiedHeaderParamsByPath<Api, M, Path>>;
};
