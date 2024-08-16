# @zodified-api/next

`@zodified-api/next` is an extension for [ZodifiedAPI](https://www.npmjs.com/package/@zodified-api/core) that provides seamless integration with Next.js. It allows you to create type-safe APIs using ZodifiedAPI's robust validation and handling mechanisms while leveraging the powerful features of Next.js.

## Features

- **Type Safety**: Ensures type safety across your Next.js API routes.
- **Zod Integration**: Utilizes Zod for schema validation, ensuring consistent data validation.
- **Next.js Compatibility**: Works seamlessly with both the App Router and Pages Router in Next.js.
- **Mocking Support**: Leverage the `useMock` feature to simulate API responses in your Next.js API routes, ideal for testing and development.
- **Middleware Support**: Easily add and manage middleware for your API routes.
- **Fetch-Based Implementation**: Unlike Zodios, this library wraps around `fetch` instead of `axios`.

## Installation

You can install the package via npm:

```bash
npm install @zodified-api/next
```

or via yarn:

```bash
yarn add @zodified-api/next
```

## Usage

### 1. Define Your API Configuration

First, use `zod` to define your API configuration and schema validation.

```typescript
import { z } from 'zod';
import { makeApi, makeEndpoint } from '@zodified-api/core';

// Define a schema for the user object
const userSchema = z.object({
  id: z.number(),
  name: z.string(),
});

// Define a 'getUser' endpoint
const getUser = makeEndpoint({
  method: 'get',
  path: '/user',
  alias: 'getUser',
  description: 'Fetch a user by ID',
  parameters: [
    {
      type: 'Query',
      name: 'id',
      schema: z.number(),
      description: 'User ID',
    },
  ],
  response: userSchema,
  customProperties: {
    authRequired: true,
  },
});

// Combine all endpoints into a single API configuration
export const api = makeApi([getUser]);
```

### 2. Create a Next.js API Route

Use the `NextJsAppRouter` or `NextJsPagesRouter` classes to create a type-safe API route that integrates with Next.js.

#### Example with the Next.js App Router

```typescript
import { Method, findEndpointByMethodAndPath } from '@zodified-api/core';
import { NextJsAppRouter } from '@zodified-api/next';
import { api } from '@/api'; // Your API configuration file
import type { NextRequest } from 'next/server';

// Define the request handler for the '/user' endpoint
const handler = async (req) => {
  const user = { id: 1, name: 'John Doe' };
  return user;
};

// Initialize the Next.js API router with the defined API configuration
const router = new NextJsAppRouter(api);

// Add middleware to the router
router.use((req, res, next) => {
  const { method, nextUrl } = req;
  const endpoint = findEndpointByMethodAndPath(
    api,
    method.toLowerCase() as Method,
    nextUrl.pathname as any, // Cast pathname to any to satisfy type checks
  );

  if (!endpoint) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (endpoint.customProperties.authRequired) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
});

// Export the GET handler for the '/user' route
export const GET = router.handleAppRoute('get', '/user', handler);
```

### Explanation

1. **API Request Handler**:
   - The `handler` function processes incoming API requests and returns a user object.
   - The `findEndpointByMethodAndPath` function is used to retrieve endpoint metadata, such as custom properties.

2. **Middleware Integration**:
   - Middleware is used to check if the requested endpoint requires authentication. If the endpoint is not found or if authentication is required and not provided, appropriate HTTP responses (`404 Not Found` or `401 Unauthorized`) are returned.

3. **NextJsAppRouter and NextJsPagesRouter**:
   - `NextJsAppRouter` is used for handling API routes in the Next.js App Router.
   - The `handleAppRoute` method connects the handler function to the appropriate HTTP method and path, ensuring clean, organized, and type-safe API route management within a Next.js project.

## API Reference

### `NextJsAppRouter`

A class that extends ZodifiedAPI's server capabilities to integrate with Next.js.

- **Methods**:
  - `handleAppRoute<M extends Method, Path extends ZodifiedPathsByMethod<Api, M>>(
      method: M,
      path: Path,
      handler: ZodifiedHandler<Api, M, Path, NextRequestAdapter, NextResponseAdapter>
    )`: Handles a specific API endpoint in the Next.js App Router.
  - `use(middleware: (req: NextRequestAdapter, res: NextResponseAdapter, next: () => void) => void)`: Adds middleware to the router.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue on the [GitHub repository](https://github.com/Euphysics/zodified-api.git).

## License

This project is licensed under the MIT License.
