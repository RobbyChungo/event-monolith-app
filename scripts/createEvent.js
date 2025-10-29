const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const title = process.env.EVENT_TITLE || 'Smoke Event'
  const description = process.env.EVENT_DESC || 'Created by smoke test'
  const date = process.env.EVENT_DATE ? new Date(process.env.EVENT_DATE) : new Date(Date.now() + 1000 * 60 * 60 * 24)
  const location = process.env.EVENT_LOCATION || 'Online'
  const userId = Number(process.env.CREATED_BY_ID)
  if (!userId) {
    console.error('Please provide CREATED_BY_ID env var')
    process.exit(2)
  }

  const event = await prisma.event.create({
    data: {
      title,
      description,
      date,
      location,
      createdById: userId
    }
  })

  console.log('CREATED_EVENT_ID=' + event.id)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
}).finally(() => prisma.$disconnect())
