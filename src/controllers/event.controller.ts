import { sendNotification } from '../services/notificationService'
import { Request, Response } from 'express'
import prisma from '../config/prisma'

// Create a new event
export const createEvent = async (req: Request, res: Response) => {
  try {
    const { title, description, date, userId } = req.body

    if (!title || !date || !userId) {
      return res.status(400).json({ error: 'title, date and userId are required' })
    }

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        userId,
      },
    })

    sendNotification('📢 New event created', event)
    res.status(201).json(event)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event', details: error })
  }
}


// Get all events
export const getEvents = async (_req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      include: { user: true }, // Show who created each event
    })
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events', details: error })
  }
}
