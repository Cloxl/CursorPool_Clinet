import type { Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

export function setupRouterGuards(router: Router) {
  router.beforeEach(
    (to: RouteLocationNormalized, _from: RouteLocationNormalized, next: NavigationGuardNext) => {
      const apiKey = localStorage.getItem('apiKey')

      if (to.name !== 'login' && !apiKey) {
        next({ name: 'login' })
      } else if (to.name === 'login' && apiKey) {
        next({ name: 'dashboard' })
      } else {
        next()
      }
    },
  )
}
