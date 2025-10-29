import type { Elysia } from 'elysia'

// Small helper to register a global error handler if Elysia exposes `onError`.
// We use a safe `any` cast because Elysia's typing for `onError` may differ by version.
export function registerErrorPlugin(app: Elysia) {
  const a = app as any
  if (typeof a.onError === 'function') {
    a.onError((err: any, ctx: any) => {
      console.error('[elysia:onError]', err)
      if (process.env.NODE_ENV === 'production') {
        return { error: 'Internal Server Error' }
      }
      return { error: 'Internal Server Error', detail: err?.message }
    })
  }
}
