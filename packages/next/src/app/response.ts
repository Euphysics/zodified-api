import { NextResponse } from "next/server";
import type { BaseResponse } from "../types";

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
