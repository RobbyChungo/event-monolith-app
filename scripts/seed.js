const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')
  // Ensure Prisma can connect and the DB is ready. You can expand this to insert
  // required seed data (roles, demo users, etc.). For now we just connect.
  await prisma.$connect()
  // Optionally create a demo user if none exists
  const count = await prisma.user.count()
  if (count === 0) {
    await prisma.user.create({ data: { name: 'Seed User', email: `seed+${Date.now()}@test.local`, password: 'changeme' } })
    console.log('Created seed user')
  }
  await prisma.$disconnect()
  console.log('Seeding complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
