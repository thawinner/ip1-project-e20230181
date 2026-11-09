import { HttpError } from '@/api/http'

export function errorMessage(e: unknown) {
  if (e instanceof HttpError || e instanceof Error) return e.message
  return 'Something went wrong, please try again'
}

export function fieldErrors(e: unknown): Record<string, string> {
  return e instanceof HttpError && e.fields ? e.fields : {}
}
