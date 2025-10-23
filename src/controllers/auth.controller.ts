import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../config/prisma'
import { signJwt } from '../utils/jwt.utils'

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { name, email, password: hashed },
    })

    // Don't return password
    // Sign a token so client can be logged in immediately
    const token = signJwt({ userId: user.id, email: user.email })

    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to register user', details: error })
  }
}

// Login existing user
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'email and password required' })

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return res.status(401).json({ error: 'Invalid credentials' })

    const ok = await bcrypt.compare(password, user.password)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })

    const token = signJwt({ userId: user.id, email: user.email })

    res.json({ user: { id: user.id, name: user.name, email: user.email }, token })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to login', details: error })
  }
}

// Get current user profile (requires auth middleware)
export const me = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return res.status(404).json({ error: 'User not found' })

    res.json({ id: dbUser.id, name: dbUser.name, email: dbUser.email })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch profile', details: error })
  }
}

