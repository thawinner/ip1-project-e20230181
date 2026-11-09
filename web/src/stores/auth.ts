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
  const homeRoute = computed(() => (isManager.value ? '/manager/dashboard' : '/dashboard'))

  async function login(input: LoginInput) {
    const result = await authApi.login(input)
    user.value = result.user
    token.value = result.token
    setToken(result.token)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result))
    } catch {
      // private mode: stay logged in until the tab closes
    }
  }

  function logout() {
    user.value = null
    token.value = null
    setToken(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // nothing saved
    }
  }

  return { user, token, isLoggedIn, isManager, homeRoute, login, logout }
})
