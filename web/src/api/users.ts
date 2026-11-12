import { http, HttpError } from './http'
import { passwordRow } from './auth'
import { checkAccount, passwordError, type AccountInput } from '@/utils/accountRules'
import type { Id, User } from '@/types'

export function listUsers() {
  return http.get<User[]>('/users', { _sort: 'fullName' })
}

export function getUser(id: Id) {
  return http.get<User>(`/users/${id}`)
}

// Mock only: below, the browser checks what the server will check (POST/PATCH /users in M2)

function now() {
  const d = new Date()
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 19)
}

async function check(input: AccountInput, id: Id | null): Promise<AccountInput> {
  const clean = {
    fullName: input.fullName.trim(),
    username: input.username.trim().toLowerCase(),
    phone: input.phone.replace(/\s/g, ''),
  }
  const errors = checkAccount(clean)
  const first = Object.values(errors)[0]
  if (first) throw new HttpError(400, first, errors)

  const same = await http.get<User[]>('/users', { username: clean.username })
  if (same.some((u) => u.id !== id)) {
    throw new HttpError(409, 'This username is already taken', { username: 'This username is already taken' })
  }
  return clean
}

// Story 1: the manager adds a storekeeper with a temporary password; they must set their own at first login
export async function createUser(input: AccountInput, temporaryPassword: string): Promise<User> {
  const weak = passwordError(temporaryPassword)
  if (weak) throw new HttpError(400, weak, { password: weak })
  const clean = await check(input, null)

  const user = await http.post<User>('/users', {
    ...clean,
    role: 'STAFF',
    isActive: true,
    mustChangePassword: true,
    createdAt: now(),
  })
  await http.post('/passwords', { userId: user.id, password: temporaryPassword })
  return user
}

export async function updateUser(id: Id, input: AccountInput) {
  return http.patch<User>(`/users/${id}`, await check(input, id))
}

// Story 10: deactivate (never delete) a storekeeper; not your own account
export async function setActive(id: Id, active: boolean, me: User) {
  if (!active && id === me.id) throw new HttpError(400, 'You cannot deactivate your own account')
  return http.patch<User>(`/users/${id}`, { isActive: active })
}

// A new temporary password: the storekeeper must choose their own again at the next login
export async function resetPassword(id: Id, temporaryPassword: string) {
  const weak = passwordError(temporaryPassword)
  if (weak) throw new HttpError(400, weak, { password: weak })
  const row = await passwordRow(id)
  if (row) await http.patch(`/passwords/${row.id}`, { password: temporaryPassword })
  else await http.post('/passwords', { userId: id, password: temporaryPassword })
  return http.patch<User>(`/users/${id}`, { mustChangePassword: true })
}
