import { execSync } from 'child_process'
import { beforeAll, afterAll } from 'vitest'

let dockerContainerId: string | null = null

beforeAll(async () => {
  // If DATABASE_URL already provided (CI sets it), skip starting a container
  if (process.env.DATABASE_URL) {
    console.log('[test setup] using existing DATABASE_URL:', process.env.DATABASE_URL)
    // still run migrations & generate client
    execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env } })
    execSync('npx prisma generate', { stdio: 'inherit', env: { ...process.env } })
    return
  }

  console.log('[test setup] starting postgres container via docker CLI...')
  // If there's a docker-compose.yml present, prefer using it (maps to fixed ports)
  const fs = require('fs')
  const path = require('path')
  const repoRoot = path.resolve(__dirname, '../../')
  const composeFile = fs.existsSync(path.join(repoRoot, 'docker-compose.yml')) || fs.existsSync(path.join(repoRoot, 'docker-compose.yaml'))
  let startedCompose = false

  // Helper to check for a CLI command
  function hasCommand(cmd: string) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' })
      return true
    } catch {
      return false
    }
  }

  if (composeFile) {
    console.log('[test setup] docker-compose.yml found — attempting `docker compose up -d postgres`')
    if (!hasCommand('docker')) {
      console.warn('[test setup] docker CLI not found — skipping DB setup; integration tests will be skipped')
      return
    }

    // Prefer `docker compose` (v2) but fall back to `docker-compose` if necessary
    const composeCmd = hasCommand('docker') ? 'docker compose' : 'docker-compose'
    try {
      execSync(`${composeCmd} -f ${path.join(repoRoot, 'docker-compose.yml')} up -d postgres`, { stdio: 'inherit' })
      startedCompose = true
      dockerContainerId = null
      // Our docker-compose binds to localhost:5432 (see repo docker-compose.yml)
      const dbUrl = `postgresql://postgres:postgres@localhost:5432/eventdb`
      process.env.DATABASE_URL = dbUrl
      console.log('[test setup] DATABASE_URL=', dbUrl)
    } catch (e) {
      console.warn('[test setup] docker compose up failed, falling back to docker run', e)
    }
  }

  if (!process.env.DATABASE_URL) {
    // Ensure docker CLI is available
    if (!hasCommand('docker')) {
      console.warn('[test setup] docker CLI not found — skipping DB setup; integration tests will be skipped')
      return
    }

    // Start postgres container publishing random host port (-P)
    const runCmd = 'docker run -d -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=testdb -P postgres:15'
    const id = execSync(runCmd, { encoding: 'utf8' }).trim()
    dockerContainerId = id
    console.log('[test setup] docker container id=', id)

    // Inspect mapped port for 5432
    const portInfo = execSync(`docker port ${id} 5432`, { encoding: 'utf8' }).trim()
    // portInfo looks like '0.0.0.0:32768' or ':::32768'
    const match = portInfo.match(/:(\d+)$/)
    if (!match) throw new Error('Could not determine mapped port: ' + portInfo)
    const port = match[1]
    const host = 'localhost'
    const dbUrl = `postgresql://postgres:postgres@${host}:${port}/testdb`
    process.env.DATABASE_URL = dbUrl
    console.log('[test setup] DATABASE_URL=', dbUrl)
  }

  // Run migrations and generate client
  console.log('[test setup] running prisma migrate deploy...')
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: { ...process.env } })
  execSync('npx prisma generate', { stdio: 'inherit', env: { ...process.env } })
})

afterAll(async () => {
  try {
    if (dockerContainerId) {
      console.log('[test teardown] stopping container...', dockerContainerId)
      execSync(`docker rm -f ${dockerContainerId}`, { stdio: 'inherit' })
    } else {
      // If we started docker-compose, bring it down
      const fs = require('fs')
      const path = require('path')
      const repoRoot = path.resolve(__dirname, '../../')
      // Recreate hasCommand here since it's not in scope of this block
      function hasCommandLocal(cmd: string) {
        try {
          execSync(`${cmd} --version`, { stdio: 'ignore' })
          return true
        } catch {
          return false
        }
      }

      if (fs.existsSync(path.join(repoRoot, 'docker-compose.yml')) && hasCommandLocal('docker')) {
        try {
          console.log('[test teardown] bringing down docker compose')
          execSync(`docker compose -f ${path.join(repoRoot, 'docker-compose.yml')} down`, { stdio: 'inherit' })
        } catch (e) {
          console.warn('[test teardown] docker compose down failed', e)
        }
      }
    }
  } catch (e) {
    console.error('[test teardown] error stopping container', e)
  }
})
