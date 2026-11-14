import { ref } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AppId } from '@/apps'
import { rememberVisit } from '@/utils/lastVisit'
import LoginView from '@/views/LoginView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean // open without logging in
    managerOnly?: boolean // staff see the access error instead (story 10)
    app?: AppId // the section shown in the top bar
    title?: string // the browser tab: "ShopStock · Products"
  }
}

// Addresses name the thing, not the role: /products/1/edit, /approvals. Who may open a page is checked by the
// guard below (meta.managerOnly), the same way the API checks the role, so one page never has two addresses.
// Filters are named in the query: /products?stock=low, /moves?status=pending.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // The home menu (grid button in the top bar)
    { path: '/', name: 'home', component: () => import('@/views/HomeMenuView.vue'), meta: { title: 'Home menu' } },
    { path: '/login', name: 'login', component: LoginView, meta: { public: true, title: 'Log in' } },

    // Products (stories 3, 4, 5, 7)
    {
      path: '/products',
      name: 'products',
      component: () => import('@/views/ProductsView.vue'),
      meta: { app: 'products', title: 'Products' },
    },

    // Any other address: the 404 page at that address
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { title: 'Not found' },
    },
  ],
})

// Story 10: a storekeeper on a manager page sees the access error at that same address (App.vue shows it),
// like the 404 page, instead of being sent to another address
export const accessDenied = ref(false)

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (!to.meta.public && !auth.isLoggedIn) {
    return { name: 'login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }
  // Story 2: you start on the home menu, which shows your role's sections
  if (to.name === 'login' && auth.isLoggedIn) return '/'
  accessDenied.value = Boolean(to.meta.managerOnly && !auth.isManager)
})

// The product page puts the product's name in the title once it has loaded
router.afterEach((to) => {
  document.title = `ShopStock · ${accessDenied.value ? 'Access error' : (to.meta.title ?? 'Inventory')}`
  const auth = useAuthStore()
  const id = Number(to.params.id)
  if ((to.name === 'product' || to.name === 'move') && Number.isInteger(id) && auth.user) {
    rememberVisit({ kind: to.name, id, userId: auth.user.id })
  }
})

export default router
