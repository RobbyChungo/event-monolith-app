import { Request, Response } from 'express'
import prisma from '../config/prisma'

// Create a new user
export const createUser = async (req: Request, res: Response) => {
  try {
    const { name, email } = req.body
    const user = await prisma.user.create({
      data: { name, email },
    })
    res.status(201).json(user)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user', details: error })
  }
}

// Get all users
export const getUsers = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany()
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users', details: error })
  }
}
