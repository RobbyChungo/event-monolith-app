import { Request, Response, NextFunction } from 'express'
import { verifyJwt } from '../utils/jwt.utils'
import prisma from '../config/prisma'

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers['authorization'] as string | undefined
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' })

  const token = auth.split(' ')[1]
  const payload = verifyJwt(token)
  if (!payload) return res.status(401).json({ error: 'Invalid token' })

  // Attach user to request
  const user = await prisma.user.findUnique({ where: { id: payload.userId } })
  if (!user) return res.status(401).json({ error: 'User not found' })

  ;(req as any).user = { id: user.id, email: user.email, role: user.role }
  next()
}

