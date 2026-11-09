import { http, HttpError } from './http'
import type { LoginInput, User } from '@/types'

export interface LoginResult {
  token: string
  user: User
}

// Mock only: db.json has no passwords, so every demo account uses this one.
// In M3 this whole function becomes POST /auth/login.
const DEMO_PASSWORD = 'shopstock1'

export async function login({ username, password }: LoginInput): Promise<LoginResult> {
  const [user] = await http.get<User[]>('/users', { username: username.trim().toLowerCase() })
  if (!user || password !== DEMO_PASSWORD) throw new HttpError(401, 'Invalid username or password')
  if (!user.isActive) throw new HttpError(403, 'This account is deactivated')
  return { token: `mock-token-${user.id}`, user }
}
