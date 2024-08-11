# @zodified-api/next

`@zodified-api/next` is an extension for [ZodifiedAPI](https://www.npmjs.com/package/@zodified-api/core) that provides seamless integration with Next.js. It allows you to create type-safe APIs using ZodifiedAPI's robust validation and handling mechanisms, while leveraging the powerful features of Next.js.

## Features

- **Type Safety**: Ensures type safety across your Next.js API routes.
- **Zod Integration**: Utilizes Zod for schema validation, ensuring consistent data validation.
- **Next.js Compatibility**: Works seamlessly with both the App Router and Pages Router in Next.js.
- **Middleware Support**: Easily add and manage middleware for your API routes.
- **Custom Error Handling**: Handles API errors gracefully with custom error classes.

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

Use `zod` to define your API configuration and schema validation.

```typescript
import { z } from 'zod';
import { createApiConfig } from '@zodified-api/core';

const apiConfig = createApiConfig('https://api.example.com', {
  getUser: {
    method: 'GET',
    path: '/user',
    query: z.object({ id: z.string() }),
    response: z.object({ id: z.string(), name: z.string() }),
  },
});
```

### 2. Create a Next.js API Server

Use the `NextJsApiServer` class to create a type-safe API server that integrates with Next.js.

#### App Router (Next.js 13+)

For the Next.js App Router, you can define your API handlers as follows:

```typescript
import { NextJsApiServer } from '@zodified-api/next';
import { NextRequest, NextResponse } from 'next/server';

const apiServer = new NextJsApiServer(apiConfig);

export async function GET(req: NextRequest) {
  const handler = apiServer.handleAppRoute('getUser', async (req, res) => {
    const user = { id: req.parsedQuery.id, name: 'John Doe' };
    return user;
  });

  return handler(req);
}
```

#### Pages Router

For the Next.js Pages Router, use the following approach:

```typescript
import { NextJsApiServer } from '@zodified-api/next';
import { NextApiRequest, NextApiResponse } from 'next';

const apiServer = new NextJsApiServer(apiConfig);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const handle = apiServer.handlePagesRoute('getUser', async (req, res) => {
    const user = { id: req.parsedQuery.id, name: 'John Doe' };
    return user;
  });

  await handle(req, res);
}
```

### 3. Middleware Support

You can easily add middleware to your API server using the `use` method.

```typescript
apiServer.use(async (req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});
```

### 4. Error Handling

ZodifiedAPI provides custom error classes for API and network errors, which can be caught and handled appropriately.

```typescript
import { ApiError } from '@zodified-api/core';

apiServer.handle('getUser', async (req, res) => {
  try {
    // Your API logic here
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
});
```

## API Reference

### `NextJsApiServer`

A class that extends ZodifiedAPI's server capabilities to integrate with Next.js.

- **Methods**:
  - `handleAppRoute(endpointKey, handler)`: Handles a specific API endpoint in the Next.js App Router.
  - `handlePagesRoute(endpointKey, handler)`: Handles a specific API endpoint in the Next.js Pages Router.

### `NextRequestAdapter` & `NextResponseAdapter`

Adapters that convert Next.js `NextRequest` and `NextResponse` objects to generic request and response objects compatible with ZodifiedAPI.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue on the [GitHub repository](https://github.com/your-repo/zodified-api-next).

## License

This project is licensed under the MIT License.
