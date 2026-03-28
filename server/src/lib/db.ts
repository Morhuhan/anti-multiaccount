import mysql from 'mysql2/promise'

function createPoolFromEnv() {
  const databaseUrl = process.env.DATABASE_URL

  if (databaseUrl) {
    const parsed = new URL(databaseUrl)

    return mysql.createPool({
      host: parsed.hostname,
      port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      waitForConnections: true,
      connectionLimit: 10,
      namedPlaceholders: true,
    })
  }

  return mysql.createPool({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'anti_multiaccount',
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  })
}

export const db = createPoolFromEnv()
