import type { GenericResponse } from "@zodified-api/core";
import type { NextApiResponse } from "next";

export class NextApiResponseAdapter implements GenericResponse {
  constructor(private res: NextApiResponse) {}

  status(code: number): GenericResponse {
    this.res.status(code);
    return this;
  }

  json(data: unknown): void {
    this.res.json(data);
  }
}
