/** Thrown by the API client. status 0 = network/timeout, 404 unknown run, 409 bad transition. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
  }
}

/** Turns anything thrown into a message we can show in the error banner. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
