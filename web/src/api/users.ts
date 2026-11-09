import { http } from './http'
import type { Id, User } from '@/types'

export function listUsers() {
  return http.get<User[]>('/users', { _sort: 'fullName' })
}

export function getUser(id: Id) {
  return http.get<User>(`/users/${id}`)
}
