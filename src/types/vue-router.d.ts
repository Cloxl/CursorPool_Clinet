import 'vue-router'

declare module 'vue-router' {
  export declare function createRouter(options: RouterOptions): Router

  export declare function createWebHistory(base?: string): RouterHistory
  export declare function createWebHashHistory(base?: string): RouterHistory
  export declare function createMemoryHistory(base?: string): RouterHistory

  export interface RouterHistory {
    base: string
    location: string
    state: HistoryState
    push(to: RawLocation): Promise<void>
    replace(to: RawLocation): Promise<void>
    go(delta: number): void
    back(): void
    forward(): void
  }

  export interface Router {
    push(to: RawLocation): Promise<void>
    replace(to: RawLocation): Promise<void>
    go(delta: number): void
    back(): void
    forward(): void
  }

  export interface RouterOptions {
    history: RouterHistory
    routes: RouteRecordRaw[]
  }

  export interface RouteRecordRaw {
    path: string
    name?: string | symbol
    component?: any
    components?: { [key: string]: any }
    redirect?: string | Location | Function
    children?: RouteRecordRaw[]
    meta?: any
  }

  export interface HistoryState {
    [key: string]: any
  }

  export type RawLocation = string | Location

  export interface Location {
    name?: string | symbol
    path?: string
    hash?: string
    query?: Record<string, string | string[]>
    params?: Record<string, string>
    append?: boolean
    replace?: boolean
  }

  export declare function useRouter(): Router

  interface RouteMeta {
    requiresAuth?: boolean
  }
}
