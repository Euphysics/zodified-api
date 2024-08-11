import type { GenericRequest, HttpMethod } from "@zodified-api/core";
import type { NextRequest } from "next/server";

export class NextRequestAdapter implements GenericRequest {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  query: Record<string, string>;
  body: unknown;

  constructor(private req: NextRequest) {
    this.method = req.method as HttpMethod;
    this.url = req.url;
    this.headers = Object.fromEntries(req.headers.entries());
    this.query = Object.fromEntries(req.nextUrl.searchParams.entries());
  }

  async parseBody(): Promise<void> {
    if (this.req.body) {
      this.body = await this.req.json();
    }
  }
}
