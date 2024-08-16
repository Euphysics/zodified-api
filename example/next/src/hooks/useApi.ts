import { useMemo } from "react";

import { ApiClient } from "@/api";

export const useApi = () => {
  const api = useMemo(() => {
    return ApiClient;
  }, []);
  return api;
};
