import { http, HttpError } from './http'
import { checkNewPassword } from '@/utils/accountRules'
import type { Id, LoginInput, User } from '@/types'

export interface LoginResult {
  token: string
  user: User
}

// Mock only: db.json keeps plain passwords in a separate "passwords" list. In M2/M3 the API keeps a
// bcrypt passwordHash on the user and these functions become POST /auth/login and PATCH /auth/password.
export const DEMO_PASSWORD = 'shopstock1'

interface PasswordRow {
  id: Id
  userId: Id
  password: string
}

export async function passwordRow(userId: Id) {
  const [row] = await http.get<PasswordRow[]>('/passwords', { userId })
  return row
}

export async function login({ username, password }: LoginInput): Promise<LoginResult> {
  const [user] = await http.get<User[]>('/users', { username: username.trim().toLowerCase() })
  const row = user ? await passwordRow(user.id) : undefined
  if (!user || !row || row.password !== password) throw new HttpError(401, 'Invalid username or password')
  if (!user.isActive) throw new HttpError(403, 'This account is deactivated')
  return { token: `mock-token-${user.id}`, user }
}

// Story 1: a storekeeper with a temporary password sets their own here; then mustChangePassword is false
export async function changePassword(user: User, current: string, next: string, confirm: string): Promise<User> {
  const errors = checkNewPassword(current, next, confirm)
  const first = Object.values(errors)[0]
  if (first) throw new HttpError(400, first, errors)

  const row = await passwordRow(user.id)
  if (!row || row.password !== current) {
    throw new HttpError(400, 'Current password is wrong', { current: 'Current password is wrong' })
  }
  await http.patch(`/passwords/${row.id}`, { password: next })
  return http.patch<User>(`/users/${user.id}`, { mustChangePassword: false })
}
