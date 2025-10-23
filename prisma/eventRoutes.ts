import { Router } from 'express'
import prisma from '../prismaClient'

const router = Router()

// 🔹 Get all events
router.get('/', async (_req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: { createdBy: true } // show user info
    })
    res.json(events)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' })
  }
})

// 🔹 Create a new event
router.post('/', async (req, res) => {
  try {
    const { title, description, date, location, createdById } = req.body
    const event = await prisma.event.create({
      data: { title, description, date: new Date(date), location, createdById }
    })
    res.json(event)
  } catch (error) {
    res.status(500).json({ error: 'Failed to create event' })
  }
})

// 🔹 Register a user for an event (simulate RegistrationService)
router.post('/:id/register', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id)
    const { userId } = req.body

    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event) return res.status(404).json({ error: 'Event not found' })

    // For demo: prevent same user re-registering (simulate LockManager)
    const existing = await prisma.notification.findFirst({
      where: { eventId, message: { contains: `User ${userId}` } }
    })
    if (existing) return res.status(400).json({ error: 'Already registered' })

    await prisma.notification.create({
      data: { message: `User ${userId} registered for ${event.title}`, eventId }
    })

    res.json({ success: true, message: 'Registered successfully!' })
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' })
  }
})

export default router
