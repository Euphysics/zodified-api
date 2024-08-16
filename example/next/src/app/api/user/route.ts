import { type Method, findEndpointByMethodAndPath } from "@zodified-api/core";
import { NextJsAppRouter, type NextRequestAdapter } from "@zodified-api/next";

import { api } from "@/api";

const handler = async (req: NextRequestAdapter) => {
  const user = {
    id: 1,
    name: "John Doe",
  };
  return user;
};

const router = new NextJsAppRouter(api);
// router.use((req, res, next) => {
//   const { method, nextUrl } = req;
//   const endpoint = findEndpointByMethodAndPath(
//     api,
//     method.toLowerCase() as Method,
//     // biome-ignore lint/suspicious/noExplicitAny: This is a valid use case for any
//     nextUrl.pathname as any,
//   );
//   if (endpoint.customProperties.authRequired) {
//     return res.status(401).json({ error: "Unauthorized" });
//   }
//   console.log("Middleware");
//   next();
// });

export const GET = router.handleAppRoute("get", "/user", handler);
