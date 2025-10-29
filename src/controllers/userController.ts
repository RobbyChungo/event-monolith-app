import { prisma } from '../utils/prismaClient'

// Simple user helpers (non-Express signatures) to keep legacy files type-safe.
export async function createUser(data: { name: string; email: string; password?: string }) {
  const { name, email, password } = data
  if (!name || !email) throw new Error('Name and email are required')
  const pwd = password ?? Math.random().toString(36).slice(2, 10)
  return prisma.user.create({ data: { name, email, password: pwd } })
}

export async function getUsers() {
  return prisma.user.findMany({ include: { events: true } })
}
