// src/routes/auth.routes.ts

import type { Elysia } from 'elysia'
import {
  signupHandler,
  loginHandler,
  verifyEmailHandler, // ✅ correct import name
} from '../controllers/auth.controller'

/**
 * Registers authentication routes (signup, login, verify)
 * @param app Elysia instance
 */
export const registerAuthRoutes = (app: Elysia) => {
  app.group('/auth', (group) =>
    group
      /**
       * @route POST /auth/signup
       * @desc Create a new user and send a verification email
       * @body { email: string, password: string, name?: string }
       */
      .post('/signup', signupHandler)

      /**
       * @route POST /auth/login
       * @desc Log in an existing user and return JWT token
       * @body { email: string, password: string }
       */
      .post('/login', loginHandler)

      /**
       * @route GET /auth/verify
       * @desc Verifies user's email using a token sent via mock email
       * @query { token: string }
       */
      .get('/verify', verifyEmailHandler) // ✅ correct handler
  )

  return app
}
