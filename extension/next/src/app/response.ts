import type { BaseResponse } from "@zodified-api/core";
import { NextResponse } from "next/server";

export class NextResponseAdapter implements BaseResponse<NextResponse> {
  private code = 200;

  status(code: number): this {
    this.code = code;
    return this;
  }

  json(data: unknown): NextResponse {
    return NextResponse.json(data, { status: this.code });
  }
}
