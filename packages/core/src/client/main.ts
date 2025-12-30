import { checkApi } from "#core/api";
import type { PluginId } from "#core/plugins";
import {
  formDataPlugin,
  formURLPlugin,
  headerPlugin,
  mockPlugin,
  ZodifiedPlugins,
  zodValidationPlugin,
} from "#core/plugins";
import type {
  Narrow,
  PickRequired,
  ReadonlyDeep,
  RequiredKeys,
  UndefinedIfNever,
} from "#core/types/utils";
import type {
  Aliases,
  AnyZodifiedRequestOptions,
  AuthConfig,
  Method,
  MockData,
  ZodifiedAliases,
  ZodifiedBodyByPath,
  ZodifiedEndpointDefinitionByAlias,
  ZodifiedEndpointDefinitionByPath,
  ZodifiedEndpointDefinitions,
  ZodifiedOptions,
  ZodifiedPathsByMethod,
  ZodifiedPlugin,
  ZodifiedRequestOptions,
  ZodifiedRequestOptionsByPath,
  ZodifiedResponse,
  ZodifiedResponseByPath,
} from "#core/types/zodified";
import { omit, replacePathParams, replaceQueryParams } from "#core/utils";

/**
 * zodios api client based on fetch
 */
export class ZodifiedClass<Api extends ZodifiedEndpointDefinitions> {
  private baseUrl: string | undefined;
  public readonly options: PickRequired<
    ZodifiedOptions,
    "validate" | "transform" | "sendDefaults"
  >;
  public readonly api: Api;
  private endpointPlugins: Map<string, ZodifiedPlugins> = new Map();

  /**
   * constructor
   * @param baseURL - the base url to use - if omitted will use the browser domain
   * @param api - the description of all the api endpoints
   * @param options - the options to setup the client API
   */
  constructor(api: Narrow<Api>, options?: ZodifiedOptions);
  constructor(baseUrl: string, api: Narrow<Api>, options?: ZodifiedOptions);
  constructor(
    arg1?: Api | string,
    arg2?: Api | ZodifiedOptions,
    arg3?: ZodifiedOptions,
  ) {
    let options: ZodifiedOptions;
    if (!arg1) {
      if (Array.isArray(arg2)) {
        throw new Error("Zodified: missing base url");
      }
      throw new Error("Zodified: missing api description");
    }
    if (typeof arg1 === "string" && Array.isArray(arg2)) {
      this.baseUrl = arg1;
      this.api = arg2;
      options = arg3 || {};
    } else if (Array.isArray(arg1) && !Array.isArray(arg2)) {
      this.api = arg1;
      options = arg2 || {};
    } else {
      throw new Error("Zodified: api must be an array");
    }

    this.applyAuthDefaults();
    checkApi(this.api);

    this.options = {
      validate: true,
      transform: true,
      sendDefaults: false,
      ...options,
    };

    this.injectAliasEndpoints();
    this.initPlugins();
    if ([true, "all", "request", "response"].includes(this.options.validate)) {
      this.use(zodValidationPlugin(this.options));
    }
  }

  private applyAuthDefaults() {
    const authDefaults: AuthConfig = {
      requireSession: true,
      requireUser: false,
      roles: [],
      permissions: [],
    };
    for (const endpoint of this.api) {
      const { auth } = endpoint;
      endpoint.auth = {
        ...authDefaults,
        ...auth,
      };
    }
  }

  private initPlugins() {
    this.endpointPlugins.set("any-any", new ZodifiedPlugins("any", "any"));

    for (const endpoint of this.api) {
      const plugins = new ZodifiedPlugins(endpoint.method, endpoint.path);
      switch (endpoint.requestFormat) {
        case "binary":
          plugins.use(headerPlugin("Content-Type", "application/octet-stream"));
          break;
        case "form-data":
          plugins.use(formDataPlugin());
          break;
        case "form-url":
          plugins.use(formURLPlugin());
          break;
        case "text":
          plugins.use(headerPlugin("Content-Type", "text/plain"));
          break;
      }
      this.endpointPlugins.set(`${endpoint.method}-${endpoint.path}`, plugins);
    }
  }

  private getAnyEndpointPlugins() {
    return this.endpointPlugins.get("any-any");
  }

  private findAliasEndpointPlugins(alias: string) {
    const endpoint = this.api.find((endpoint) => endpoint.alias === alias);
    if (endpoint) {
      return this.endpointPlugins.get(`${endpoint.method}-${endpoint.path}`);
    }
    return undefined;
  }

  private findEnpointPlugins(method: Method, path: string) {
    return this.endpointPlugins.get(`${method}-${path}`);
  }

  /**
   * get the base url of the api
   */
  get baseURL() {
    return this.baseUrl;
  }

  /**
   * find the endpoint by alias
   * @param alias - the alias to find
   * @returns the endpoint description
   * @throws if the alias is not found
   * @throws if the alias is not unique
   */
  findEndpointByAlias<Alias extends Aliases<Api>>(
    alias: Alias,
  ): ZodifiedEndpointDefinitionByAlias<Api, Alias>[number] {
    const endpoints = this.api.filter((endpoint) => endpoint.alias === alias);
    if (endpoints.length === 0) {
      throw new Error(`Zodified: alias '${alias}' not found`);
    }
    if (endpoints.length > 1) {
      throw new Error(`Zodified: alias '${alias}' is not unique`);
    }
    return endpoints[0] as ZodifiedEndpointDefinitionByAlias<
      Api,
      Alias
    >[number];
  }

  /**
   * find the endpoint by method and path
   * @param method - the method to find
   * @param path - the path to find
   * @returns the endpoint description
   * @throws if the endpoint is not found
   * @throws if the endpoint is not unique
   */
  findEndpointByMethodAndPath<
    M extends Method,
    Path extends ZodifiedPathsByMethod<Api, M>,
  >(
    method: M,
    path: Path,
  ): ZodifiedEndpointDefinitionByPath<Api, M, Path>[number] {
    const endpoints = this.api.filter(
      (endpoint) => endpoint.method === method && endpoint.path === path,
    );
    if (endpoints.length === 0) {
      throw new Error(`Zodified: endpoint '${method} ${path}' not found`);
    }
    if (endpoints.length > 1) {
      throw new Error(`Zodified: endpoint '${method} ${path}' is not unique`);
    }
    return endpoints[0] as ZodifiedEndpointDefinitionByPath<
      Api,
      M,
      Path
    >[number];
  }

  /**
   * register a plugin to intercept the requests or responses
   * @param plugin - the plugin to use
   * @returns an id to allow you to unregister the plugin
   */
  use(plugin: ZodifiedPlugin): PluginId;
  use<Alias extends Aliases<Api>>(
    alias: Alias,
    plugin: ZodifiedPlugin,
  ): PluginId;
  use<M extends Method, Path extends ZodifiedPathsByMethod<Api, M>>(
    method: M,
    path: Path,
    plugin: ZodifiedPlugin,
  ): PluginId;
  use(...args: unknown[]) {
    if (typeof args[0] === "object") {
      const plugins = this.getAnyEndpointPlugins()!;
      return plugins.use(args[0] as ZodifiedPlugin);
    }
    if (typeof args[0] === "string" && typeof args[1] === "object") {
      const plugins = this.findAliasEndpointPlugins(args[0]);
      if (!plugins)
        throw new Error(
          `Zodified: no alias '${args[0]}' found to register plugin`,
        );
      return plugins.use(args[1] as ZodifiedPlugin);
    }
    if (
      typeof args[0] === "string" &&
      typeof args[1] === "string" &&
      typeof args[2] === "object"
    ) {
      const plugins = this.findEnpointPlugins(args[0] as Method, args[1]);
      if (!plugins)
        throw new Error(
          `Zodified: no endpoint '${args[0]} ${args[1]}' found to register plugin`,
        );
      return plugins.use(args[2] as ZodifiedPlugin);
    }
    throw new Error("Zodified: invalid plugin registration");
  }

  useMock(mockData: MockData<Api>, delay = 0): PluginId {
    return this.use(mockPlugin(mockData, delay));
  }

  /**
   * unregister a plugin
   * if the plugin name is provided instead of the registration plugin id,
   * it will unregister the plugin with that name only for non-endpoint plugins
   * @param plugin - id of the plugin to remove
   */
  eject(plugin: PluginId | string): void {
    if (typeof plugin === "string") {
      const plugins = this.getAnyEndpointPlugins()!;
      plugins.eject(plugin);
      return;
    }
    this.endpointPlugins.get(plugin.key)?.eject(plugin);
  }

  private injectAliasEndpoints() {
    for (const endpoint of this.api) {
      if (endpoint.alias) {
        if (["post", "put", "patch", "delete"].includes(endpoint.method)) {
          // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
          (this as any)[endpoint.alias] = (data: any, config: any) =>
            this.request({
              ...config,
              method: endpoint.method,
              url: endpoint.path,
              data,
            });
        } else {
          // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
          (this as any)[endpoint.alias] = (config: any) =>
            this.request({
              ...config,
              method: endpoint.method,
              url: endpoint.path,
            });
        }
      }
    }
  }

  /**
   * make a request to the api
   * @param config - the config to setup zodios options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async request<M extends Method, Path extends string>(
    config: Path extends ZodifiedPathsByMethod<Api, M>
      ? ReadonlyDeep<ZodifiedRequestOptions<Api, M, Path>>
      : ReadonlyDeep<
          ZodifiedRequestOptions<Api, M, ZodifiedPathsByMethod<Api, M>>
        >,
  ): Promise<
    ZodifiedResponseByPath<
      Api,
      M,
      Path extends ZodifiedPathsByMethod<Api, M> ? Path : never
    >
  > {
    let conf = config as unknown as ReadonlyDeep<AnyZodifiedRequestOptions>;
    const anyPlugin = this.getAnyEndpointPlugins()!;
    const endpointPlugin = this.findEnpointPlugins(conf.method, conf.url);
    conf = await anyPlugin.interceptRequest(this.api, conf);
    if (endpointPlugin) {
      conf = await endpointPlugin.interceptRequest(this.api, conf);
    }

    // return the mockData if mockResponse is set
    if (conf.mockResponse) {
      return await conf.mockResponse.json();
    }

    let { url } = conf;
    url = replaceQueryParams(conf);
    url = `${this.baseUrl || ""}${replacePathParams({ ...conf, url })}`;
    const response = await fetch(url, {
      headers: conf.headers,
      body: JSON.stringify(conf.body),
      ...omit(conf as AnyZodifiedRequestOptions, ["params", "queries", "body"]),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    let result = response as ZodifiedResponse;

    // Apply endpoint-specific plugins
    if (endpointPlugin) {
      result = await endpointPlugin.interceptResponse(this.api, conf, result);
    }

    // Apply global plugins
    result = await anyPlugin.interceptResponse(this.api, conf, result);

    // Check if parsedBody already exists
    if (!result.parsedBody) {
      result.parsedBody = await result.json();
    }

    return result.parsedBody as ZodifiedResponseByPath<
      Api,
      M,
      Path extends ZodifiedPathsByMethod<Api, M> ? Path : never
    >;
  }

  /**
   * make a get request to the api
   * @param path - the path to api endpoint
   * @param config - the config to setup fetch options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async get<
    Path extends ZodifiedPathsByMethod<Api, "get">,
    TConfig extends ZodifiedRequestOptionsByPath<Api, "get", Path>,
  >(
    path: Path,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodifiedResponseByPath<Api, "get", Path>> {
    return this.request({
      ...config,
      method: "get",
      url: path,
      // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
    } as any);
  }

  /**
   * make a post request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup fetch options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async post<
    Path extends ZodifiedPathsByMethod<Api, "post">,
    TConfig extends ZodifiedRequestOptionsByPath<Api, "post", Path>,
  >(
    path: Path,
    data: ReadonlyDeep<UndefinedIfNever<ZodifiedBodyByPath<Api, "post", Path>>>,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodifiedResponseByPath<Api, "post", Path>> {
    return this.request({
      ...config,
      method: "post",
      url: path,
      body: data,
      // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
    } as any);
  }

  /**
   * make a put request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup fetch options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async put<
    Path extends ZodifiedPathsByMethod<Api, "put">,
    TConfig extends ZodifiedRequestOptionsByPath<Api, "put", Path>,
  >(
    path: Path,
    data: ReadonlyDeep<UndefinedIfNever<ZodifiedBodyByPath<Api, "put", Path>>>,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodifiedResponseByPath<Api, "put", Path>> {
    return this.request({
      ...config,
      method: "put",
      url: path,
      body: data,
      // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
    } as any);
  }

  /**
   * make a patch request to the api
   * @param path - the path to api endpoint
   * @param data - the data to send
   * @param config - the config to setup fetch options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async patch<
    Path extends ZodifiedPathsByMethod<Api, "patch">,
    TConfig extends ZodifiedRequestOptionsByPath<Api, "patch", Path>,
  >(
    path: Path,
    data: ReadonlyDeep<
      UndefinedIfNever<ZodifiedBodyByPath<Api, "patch", Path>>
    >,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodifiedResponseByPath<Api, "patch", Path>> {
    return this.request({
      ...config,
      method: "patch",
      url: path,
      body: data,
      // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
    } as any);
  }

  /**
   * make a delete request to the api
   * @param path - the path to api endpoint
   * @param config - the config to setup fetch options and parameters
   * @returns response validated with zod schema provided in the api description
   */
  async delete<
    Path extends ZodifiedPathsByMethod<Api, "delete">,
    TConfig extends ZodifiedRequestOptionsByPath<Api, "delete", Path>,
  >(
    path: Path,
    data: ReadonlyDeep<
      UndefinedIfNever<ZodifiedBodyByPath<Api, "delete", Path>>
    >,
    ...[config]: RequiredKeys<TConfig> extends never
      ? [config?: ReadonlyDeep<TConfig>]
      : [config: ReadonlyDeep<TConfig>]
  ): Promise<ZodifiedResponseByPath<Api, "delete", Path>> {
    return this.request({
      ...config,
      method: "delete",
      url: path,
      body: data,
      // biome-ignore lint/suspicious/noExplicitAny: No need to specify the type here
    } as any);
  }
}

export type ZodifiedInstance<Api extends ZodifiedEndpointDefinitions> =
  ZodifiedClass<Api> & ZodifiedAliases<Api>;

export type ZodifiedConstructor = {
  new <Api extends ZodifiedEndpointDefinitions>(
    api: Narrow<Api>,
    options?: ZodifiedOptions,
  ): ZodifiedInstance<Api>;
  new <Api extends ZodifiedEndpointDefinitions>(
    baseUrl: string,
    api: Narrow<Api>,
    options?: ZodifiedOptions,
  ): ZodifiedInstance<Api>;
};

export const Zodified = ZodifiedClass as ZodifiedConstructor;

/**
 * Get the Api description type from zodios
 * @param Z - zodios type
 */
export type ApiOf<Z> = Z extends ZodifiedInstance<infer Api> ? Api : never;
