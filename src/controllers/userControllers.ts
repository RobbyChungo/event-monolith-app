import { prisma } from '../utils/prismaClient'

export async function createUser(data: { name: string; email: string; password?: string }) {
  const { name, email, password } = data
  const pwd = password ?? Math.random().toString(36).slice(2, 10)
  return prisma.user.create({ data: { name, email, password: pwd } })
}

export async function getUsers() {
  return prisma.user.findMany()
}
