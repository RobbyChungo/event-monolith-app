const fetch = global.fetch || require('node-fetch')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const API = process.env.API_BASE || 'http://localhost:3000'
// Use a unique email per run to avoid collisions with existing records
const EMAIL = `smoke+${Date.now()}@test.local`
const PASSWORD = 'Password1'

async function apiPost(path, body, token) {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API + path, { method: 'POST', headers, body: JSON.stringify(body) })
  const text = await res.text()
  try { return { status: res.status, body: JSON.parse(text) } } catch { return { status: res.status, body: text } }
}

async function apiGet(path, token) {
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(API + path, { method: 'GET', headers })
  const text = await res.text()
  try { return { status: res.status, body: JSON.parse(text) } } catch { return { status: res.status, body: text } }
}

async function main(){
  console.log('Attempting login... (email)', EMAIL)
  let login = await apiPost('/api/auth/login', { email: EMAIL, password: PASSWORD })
  let token = null
  let user = null
  if (login.status === 200 && login.body && login.body.token) {
    token = login.body.token
    user = login.body.user
    console.log('Logged in existing user', user.id)
  } else {
    console.log('Registering user...')
    const reg = await apiPost('/api/auth/register', { name: 'Smoke', email: EMAIL, password: PASSWORD })
    if (![200, 201].includes(reg.status)) { console.error('Register failed', reg); process.exit(2) }
    // Some implementations may return the token inside a Response body or as a parsed object
    token = reg.body?.token ?? (reg.body && reg.body.user ? reg.body.token : null)
    user = reg.body?.user ?? null
    console.log('Registered user', user.id)
  }

  // Create event using Prisma directly
  const event = await prisma.event.create({ data: { title: 'Smoke Event', description: 'Smoke test', date: new Date(Date.now()+86400000), location: 'Online', createdById: user.id } })
  console.log('Created event', event.id)

  // RSVP
  const rsvp = await apiPost(`/api/events/${event.id}/rsvp`, { status: 'YES' }, token)
  console.log('RSVP response:', rsvp.status, rsvp.body)

  // List RSVPs
  const list = await apiGet(`/api/events/${event.id}/rsvps`)
  console.log('List RSVPs:', list.status, list.body)

  await prisma.$disconnect()
}

main().catch(e=>{ console.error(e); process.exit(1) })
