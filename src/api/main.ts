import type { Narrow, TupleFlat, UnionToTuple } from "@/types/utils";
import type {
  Aliases,
  Method,
  ZodifiedEndpointDefinition,
  ZodifiedEndpointDefinitionByAlias,
  ZodifiedEndpointDefinitionByPath,
  ZodifiedEndpointDefinitions,
  ZodifiedEndpointError,
  ZodifiedEndpointParameter,
  ZodifiedPathsByMethod,
} from "@/types/zodified";

/**
 * check api for non unique paths
 * @param api - api to check
 * @return - nothing
 * @throws - error if api has non unique paths
 */
export const checkApi = <T extends ZodifiedEndpointDefinitions>(
  api: T,
): void => {
  const paths = new Set<string>();
  const aliases = new Set<string>();

  for (const endpoint of api) {
    const fullpath = `${endpoint.method} ${endpoint.path}`;
    if (paths.has(fullpath)) {
      throw new Error(`Zodified: Duplicate path '${fullpath}'`);
    }
    paths.add(fullpath);

    if (endpoint.alias) {
      if (aliases.has(endpoint.alias)) {
        throw new Error(`Zodified: Duplicate alias '${endpoint.alias}'`);
      }
      aliases.add(endpoint.alias);
    }

    const bodyParams =
      endpoint.parameters?.filter((p) => p.type === "Body") || [];
    if (bodyParams.length > 1) {
      throw new Error(
        `Zodified: Multiple body parameters in endpoint '${endpoint.path}'`,
      );
    }
  }
};

/**
 * Simple helper to split your api definitions into multiple files
 * Mandatory to be used when declaring your endpoint definitions outside zodios constructor
 * to enable type inferrence and autocompletion
 * @param api - api definitions
 * @returns the api definitions
 */
export const makeApi = <Api extends ZodifiedEndpointDefinitions>(
  api: Narrow<Api>,
): Api => {
  checkApi(api);
  return api as Api;
};

/**
 * Simple helper to split your parameter definitions into multiple files
 * Mandatory to be used when declaring parameters apart from your endpoint definitions
 * to enable type inferrence and autocompletion
 * @param params - api parameter definitions
 * @returns the api parameter definitions
 */
export const makeParameters = <
  ParameterDescriptions extends ZodifiedEndpointParameter[],
>(
  params: Narrow<ParameterDescriptions>,
): ParameterDescriptions => params as ParameterDescriptions;

/**
 * Simple helper to split your error definitions into multiple files
 * Mandatory to be used when declaring errors apart from your endpoint definitions
 * to enable type inferrence and autocompletion
 * @param errors - api error definitions
 * @returns the error definitions
 */
export const makeErrors = <ErrorDescription extends ZodifiedEndpointError[]>(
  errors: Narrow<ErrorDescription>,
): ErrorDescription => errors as ErrorDescription;

/**
 * Simple helper to split your endpoint definitions into multiple files
 * Mandatory to be used when declaring endpoints apart from your api definitions
 * to enable type inferrence and autocompletion
 * @param endpoint - api endpoint definition
 * @returns the endpoint definition
 */
// biome-ignore lint/suspicious/noExplicitAny: any is needed here to allow for the generic type to be inferred
export const makeEndpoint = <T extends ZodifiedEndpointDefinition<any>>(
  endpoint: Narrow<T>,
): T => endpoint as T;

type CleanPath<Path extends string> = Path extends `${infer PClean}/`
  ? PClean
  : Path;

type MapApiPath<
  Path extends string,
  Api,
  Acc extends unknown[] = [],
> = Api extends readonly [infer Head, ...infer Tail]
  ? MapApiPath<
      Path,
      Tail,
      [
        ...Acc,
        {
          [K in keyof Head]: K extends "path"
            ? Head[K] extends string
              ? CleanPath<`${Path}${Head[K]}`>
              : Head[K]
            : Head[K];
        },
      ]
    >
  : Acc;

type MergeApis<
  Apis extends Record<string, ZodifiedEndpointDefinition[]>,
  MergedPathApis = UnionToTuple<
    {
      [K in keyof Apis]: K extends string ? MapApiPath<K, Apis[K]> : never;
    }[keyof Apis]
  >,
> = TupleFlat<MergedPathApis>;

const cleanPath = (path: string): string =>
  path.endsWith("/") ? path.slice(0, -1) : path;

/**
 * prefix all paths of an api with a given prefix
 * @param prefix - the prefix to add
 * @param api - the api to prefix
 * @returns the prefixed api
 */
export const prefixApi = <
  Prefix extends string,
  Api extends ZodifiedEndpointDefinition[],
>(
  prefix: Prefix,
  api: Api,
): MapApiPath<Prefix, Api> =>
  api.map((endpoint) => ({
    ...endpoint,
    path: cleanPath(`${prefix}${endpoint.path}`),
  })) as MapApiPath<Prefix, Api>;

/**
 * Merge multiple apis into one in a route friendly way
 * @param apis - the apis to merge
 * @returns the merged api
 *
 * @example
 * ```ts
 * const api = mergeApis({
 *   "/users": usersApi,
 *   "/posts": postsApi,
 * });
 * ```
 */
export const mergeApis = <
  Apis extends Record<string, ZodifiedEndpointDefinition[]>,
>(
  apis: Apis,
): MergeApis<Apis> =>
  Object.keys(apis).flatMap((key) =>
    prefixApi(key, apis[key]),
  ) as MergeApis<Apis>;

export const findEndpointByAlias = <
  Api extends ZodifiedEndpointDefinitions,
  Alias extends Aliases<Api>,
>(
  api: Api,
  alias: Alias,
): ZodifiedEndpointDefinitionByAlias<Api, Alias>[number] => {
  const endpoints = api.filter((endpoint) => endpoint.alias === alias);
  if (endpoints.length === 0) {
    throw new Error(`Zodified: alias '${alias}' not found`);
  }
  if (endpoints.length > 1) {
    throw new Error(`Zodified: alias '${alias}' is not unique`);
  }
  return endpoints[0] as ZodifiedEndpointDefinitionByAlias<Api, Alias>[number];
};

export const findEndpointByMethodAndPath = <
  Api extends ZodifiedEndpointDefinitions,
  M extends Method,
  Path extends ZodifiedPathsByMethod<Api, M>,
>(
  api: Api,
  method: M,
  path: Path,
): ZodifiedEndpointDefinitionByPath<Api, M, Path>[number] => {
  const endpoints = api.filter(
    (endpoint) => endpoint.method === method && endpoint.path === path,
  );
  if (endpoints.length === 0) {
    throw new Error(`Zodified: endpoint '${method} ${path}' not found`);
  }
  if (endpoints.length > 1) {
    throw new Error(`Zodified: endpoint '${method} ${path}' is not unique`);
  }
  return endpoints[0] as ZodifiedEndpointDefinitionByPath<Api, M, Path>[number];
};
