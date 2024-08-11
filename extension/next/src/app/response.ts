import type { GenericResponse } from "@zodified-api/core";
import { NextResponse } from "next/server";

export class NextResponseAdapter implements GenericResponse {
  private response: NextResponse;

  constructor() {
    this.response = new NextResponse();
  }

  status(code: number): GenericResponse {
    this.response = NextResponse.next({ status: code });
    return this;
  }

  json(data: unknown): void {
    this.response = NextResponse.json(data, { status: this.response.status });
  }

  getResponse(): NextResponse {
    return this.response;
  }
}
