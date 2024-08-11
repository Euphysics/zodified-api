import type { GenericRequest, HttpMethod } from "@zodified-api/core";
import type { NextApiRequest } from "next";

export class NextApiRequestAdapter implements GenericRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;

  constructor(req: NextApiRequest) {
    this.method = req.method as HttpMethod;
    this.url = req.url || "";
    this.headers = req.headers as Record<string, string>;
    this.query = req.query as Record<string, string>;
    this.body = req.body;
  }

  async parseBody(): Promise<void> {
    // Body is already parsed in NextApiRequest
  }
}
