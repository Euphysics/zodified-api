import type { BaseRequest, Method } from "@zodified-api/core";
import { NextRequest } from "next/server";

export class NextRequestAdapter extends NextRequest implements BaseRequest {
  zodifiedMethod: Method;
  zodifiedUrl: string;
  zodifiedBody: unknown;
  zodifiedHeaders: Record<string, string | undefined>;
  zodifiedParams: Record<string, string | undefined>;
  zodifiedQuery: Record<string, string | undefined>;

  constructor(req: NextRequest, params: Record<string, string | undefined>) {
    super(req); // NextRequest のすべてのプロパティを引き継ぐ
    this.zodifiedMethod = req.method.toLowerCase() as Method;
    this.zodifiedUrl = req.url;
    this.zodifiedHeaders = Object.fromEntries(req.headers.entries());
    this.zodifiedQuery = Object.fromEntries(req.nextUrl.searchParams.entries());
    this.zodifiedParams = params;
    this.zodifiedBody = null;
  }

  async initialize(): Promise<void> {
    this.zodifiedBody = await this.parseBody();
  }

  private async parseBody(): Promise<unknown> {
    try {
      return await this.json();
    } catch {
      return null;
    }
  }
}
