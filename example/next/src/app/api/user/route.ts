import { NextJsAppRouter, type NextRequestAdapter } from "@zodified-api/next";

import { api } from "@/api";

const handler = async (_req: NextRequestAdapter) => {
  const user = {
    id: 1,
    name: "John Doe",
  };
  return user;
};

const router = new NextJsAppRouter(api);

export const GET = router.handleAppRoute("get", "/user", handler);
