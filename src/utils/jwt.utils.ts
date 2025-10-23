import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export const signJwt = (payload: Record<string, any>, expiresIn = '7d') => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn })
}

export const verifyJwt = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, any>
  } catch (error) {
    return null
  }
}

