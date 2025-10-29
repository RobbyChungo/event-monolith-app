import { prisma } from "../utils/prismaClient"
import { embedText, cosineSimilarity, averageVectors } from "./embedding"

// Upsert an embedding for a specific event based on its text fields
export async function ensureEventEmbedding(eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId } })
  if (!event) throw new Error("Event not found")

  const text = [event.title, event.description || "", event.location || ""].join(" \n")
  const vector = await embedText(text)

  const embedding = await prisma.eventEmbedding.upsert({
    where: { eventId },
    update: { vector },
    create: { eventId, vector },
  })
  return embedding
}

// Recompute the user's profile embedding from RSVPs (YES and MAYBE)
export async function recomputeUserProfile(userId: string) {
  const rsvps = await prisma.rSVP.findMany({
    where: { userId, OR: [{ response: "YES" }, { response: "MAYBE" }] as any },
    select: { eventId: true },
  })

  if (!rsvps.length) {
    return prisma.userProfile.upsert({
      where: { userId },
      update: { embedding: null },
      create: { userId, embedding: null },
    })
  }

  const eventIds = rsvps.map((r) => r.eventId)
  // fetch existing embeddings
  const existing = await prisma.eventEmbedding.findMany({ where: { eventId: { in: eventIds } } })
  const missing = eventIds.filter((id) => !existing.find((e) => e.eventId === id))
  await Promise.all(missing.map((id) => ensureEventEmbedding(id)))

  const all = await prisma.eventEmbedding.findMany({ where: { eventId: { in: eventIds } } })
  const vectors = all.map((e) => (e.vector as unknown as number[]))
  const userVec = vectors.length ? averageVectors(vectors) : []

  return prisma.userProfile.upsert({
    where: { userId },
    update: { embedding: userVec },
    create: { userId, embedding: userVec },
  })
}

export async function recommendForUser(userId: string, limit = 5) {
  const profile = await recomputeUserProfile(userId)
  const userVec = (profile.embedding as unknown as number[]) || []
  if (!userVec.length) return []

  // Exclude events the user already RSVP'd to
  const userRsvps = await prisma.rSVP.findMany({ where: { userId }, select: { eventId: true } })
  const excludeIds = new Set(userRsvps.map((r) => r.eventId))

  // Ensure we have embeddings for all events
  const events = await prisma.event.findMany({})
  const embeddings = await prisma.eventEmbedding.findMany({})
  const existingMap = new Map(embeddings.map((e) => [e.eventId, e]))

  const ensureAll = events
    .filter((e) => !existingMap.has(e.id))
    .map((e) => ensureEventEmbedding(e.id))
  if (ensureAll.length) await Promise.all(ensureAll)

  const finalEmbeddings = await prisma.eventEmbedding.findMany({})

  const scored = finalEmbeddings
    .filter((e) => !excludeIds.has(e.eventId))
    .map((e) => ({
      eventId: e.eventId,
      score: cosineSimilarity(userVec, (e.vector as unknown as number[]) || []),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)

  const withEvents = await prisma.event.findMany({ where: { id: { in: scored.map((s) => s.eventId) } } })
  const byId = new Map(withEvents.map((e) => [e.id, e]))

  return scored.map((s) => ({ event: byId.get(s.eventId), score: s.score }))
}

// Backfill embeddings for all events
export async function backfillEventEmbeddings() {
  const events = await prisma.event.findMany({ select: { id: true } })
  let created = 0, updated = 0
  for (const e of events) {
    const existing = await prisma.eventEmbedding.findUnique({ where: { eventId: e.id } })
    await ensureEventEmbedding(e.id)
    if (existing) updated++
    else created++
  }
  return { total: events.length, created, updated }
}

// Recompute all users' profiles
export async function recomputeAllUserProfiles() {
  const users = await prisma.user.findMany({ select: { id: true } })
  for (const u of users) await recomputeUserProfile(u.id)
  return { total: users.length }
}

// Fire-and-forget training hook to keep the system scalable without blocking requests
export function trainModelAsync(): void {
  // Run on next tick to avoid blocking response cycle
  setTimeout(async () => {
    try {
      // In this baseline, we simply ensure all event embeddings exist
      await backfillEventEmbeddings()
    } catch (e) {
      console.warn("[trainModelAsync] failed:", (e as any)?.message || e)
    }
  }, 0)
}