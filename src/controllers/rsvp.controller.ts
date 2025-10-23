import { Request, Response } from 'express'
import prisma from '../config/prisma'

// RSVP to an event
export const rsvpToEvent = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user
    const eventId = Number(req.params.id)
    const { status } = req.body

    if (!['YES', 'NO', 'MAYBE'].includes(status)) return res.status(400).json({ error: 'Invalid status' })

    // Upsert: create if not exists, update if exists
    const rsvp = await prisma.rSVP.upsert({
      where: { userId_eventId: { userId: user.id, eventId } },
      update: { status },
      create: { userId: user.id, eventId, status },
    })

    res.json(rsvp)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to RSVP', details: error })
  }
}

// Get RSVPs for an event
export const getEventRsvps = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id)
    const rsvps = await prisma.rSVP.findMany({ where: { eventId } })
    res.json(rsvps)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch RSVPs', details: error })
  }
}

