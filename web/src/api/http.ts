import type { ApiError, Page } from '@/types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'
export const MAX_PER_PAGE = 50

type Params = Record<string, string | number | boolean | null | undefined>

export class HttpError extends Error implements ApiError {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.fields = fields
  }
}

let token: string | null = null

export function setToken(value: string | null) {
  token = value
}

function buildUrl(path: string, params?: Params) {
  const url = new URL(path, BASE_URL)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  return url.toString()
}

function defaultMessage(status: number) {
  if (status === 401) return 'Your session has expired, please log in again'
  if (status === 403) return 'You do not have access to this'
  if (status === 404) return 'Not found'
  return 'Something went wrong, please try again'
}

async function send<T>(method: string, path: string, params?: Params, body?: unknown) {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(buildUrl(path, params), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new HttpError(0, 'Cannot reach the server, please try again')
  }

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as Partial<ApiError>
    throw new HttpError(res.status, err.message ?? defaultMessage(res.status), err.fields)
  }

  const data = (res.status === 204 ? undefined : await res.json()) as T
  return { data, headers: res.headers }
}

export const http = {
  async get<T>(path: string, params?: Params): Promise<T> {
    return (await send<T>('GET', path, params)).data
  },

  async getPage<T>(path: string, params: Params, page: number, perPage: number): Promise<Page<T>> {
    const limit = Math.min(perPage, MAX_PER_PAGE)
    const { data, headers } = await send<T[]>('GET', path, { ...params, _page: page, _limit: limit })
    const total = Number(headers.get('X-Total-Count') ?? data.length)
    return { items: data, total, page, perPage: limit }
  },

  async post<T>(path: string, body: unknown): Promise<T> {
    return (await send<T>('POST', path, undefined, body)).data
  },

  async patch<T>(path: string, body: unknown): Promise<T> {
    return (await send<T>('PATCH', path, undefined, body)).data
  },

  async delete(path: string): Promise<void> {
    await send<void>('DELETE', path)
  },
}
