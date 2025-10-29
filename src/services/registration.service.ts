// Minimal registration service wrapper used by controllers.
import { prisma } from '../utils/prismaClient'

export async function createRegistration(userId: number, eventId: number, status: string) {
		return (prisma as any).rSVP.create({ data: { userId, eventId, status } })
}

export async function listRsvpsForEvent(eventId: number) {
		return (prisma as any).rSVP.findMany({ where: { eventId }, include: { user: true } })
}
