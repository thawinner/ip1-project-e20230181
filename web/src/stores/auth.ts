import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { setToken } from '@/api/http'
import type { LoginInput, User } from '@/types'

const STORAGE_KEY = 'shopstock-auth'

interface Saved {
  token: string
  user: User
}

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Saved) : null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const saved = readSaved()
  const user = ref<User | null>(saved?.user ?? null)
  const token = ref<string | null>(saved?.token ?? null)
  setToken(token.value)

  const isLoggedIn = computed(() => user.value !== null)
  const isManager = computed(() => user.value?.role === 'MANAGER')
  // Story 1: a temporary password must be replaced before anything else
  const mustChangePassword = computed(() => user.value?.mustChangePassword === true)

  function save() {
    try {
      if (user.value && token.value) localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: token.value, user: user.value }))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // private mode: stay logged in until the tab closes
    }
  }

  async function login(input: LoginInput) {
    const result = await authApi.login(input)
    user.value = result.user
    token.value = result.token
    setToken(result.token)
    save()
  }

  function logout() {
    user.value = null
    token.value = null
    setToken(null)
    save()
  }

  // Throws on purpose: the form shows the message under the field
  async function changePassword(current: string, next: string, confirm: string) {
    if (!user.value) return
    user.value = await authApi.changePassword(user.value, current, next, confirm)
    save()
  }

  // After the manager edits their own account: the new name shows in the top bar
  function setUser(updated: User) {
    if (user.value?.id !== updated.id) return
    user.value = updated
    save()
  }

  return { user, token, isLoggedIn, isManager, mustChangePassword, login, logout, changePassword, setUser }
})
