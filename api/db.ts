import fs from 'fs'
import path from 'path'
import { put, list } from '@vercel/blob'

export type Fav = { movieId: string; title: string; posterUrl: string }

const isVercel = !!process.env.VERCEL
const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN

const baseDir = isVercel ? path.join('/tmp', 'favorites') : path.resolve(process.cwd(), 'server', 'data')

const keyForUser = (userId: string) => `favorites/${userId}.json`

async function blobListFavorites(userId: string): Promise<Fav[]> {
  try {
    const key = keyForUser(userId)
    const { blobs } = await list({ prefix: key, token: process.env.BLOB_READ_WRITE_TOKEN })
    if (!blobs || blobs.length === 0) return []
    const latest = blobs.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))[0]
    const res = await fetch(latest.url)
    if (!res.ok) return []
    const json = await res.json().catch(() => null)
    if (!Array.isArray(json)) return []
    return json as Fav[]
  } catch {
    return []
  }
}

async function blobSaveFavorites(userId: string, items: Fav[]): Promise<void> {
  const key = keyForUser(userId)
  await put(key, JSON.stringify(items), {
    contentType: 'application/json',
    access: 'public',
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  })
}

let sqliteDb: any | null = null
async function ensureDb() {
  if (sqliteDb) return sqliteDb
  if (isVercel && hasBlob) {
    throw new Error('SQLite disabled when Blob is configured on Vercel')
  }
  const DatabaseMod = await import('better-sqlite3')
  fs.mkdirSync(baseDir, { recursive: true })
  const dbPath = path.join(baseDir, 'favorites.db')
  const Database = DatabaseMod.default as any
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.exec(`
CREATE TABLE IF NOT EXISTS favorites_user (
  user_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now')),
  PRIMARY KEY (user_id, movie_id)
);
CREATE INDEX IF NOT EXISTS idx_fav_user_created ON favorites_user(user_id, created_at DESC);
`)
  sqliteDb = db
  return sqliteDb
}

async function sqliteListFavorites(userId: string): Promise<Fav[]> {
  const db = await ensureDb()
  return db
    .prepare('SELECT movie_id AS movieId, title, poster_url AS posterUrl FROM favorites_user WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Fav[]
}

async function sqliteAddFavorite(userId: string, f: Fav): Promise<void> {
  const db = await ensureDb()
  const nowSec = Math.floor(Date.now() / 1000)
  db
    .prepare('INSERT INTO favorites_user (user_id, movie_id, title, poster_url, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, movie_id) DO UPDATE SET title=excluded.title, poster_url=excluded.poster_url, created_at=excluded.created_at')
    .run(userId, f.movieId, f.title, f.posterUrl, nowSec)
}

async function sqliteRemoveFavorite(userId: string, id: string): Promise<void> {
  const db = await ensureDb()
  db.prepare('DELETE FROM favorites_user WHERE user_id = ? AND movie_id = ?').run(userId, id)
}

export async function listFavorites(userId: string): Promise<Fav[]> {
  if (isVercel && hasBlob) return blobListFavorites(userId)
  return sqliteListFavorites(userId)
}

export async function addFavorite(userId: string, f: Fav): Promise<void> {
  if (isVercel && hasBlob) {
    const current = await blobListFavorites(userId)
    const idx = current.findIndex(i => i.movieId === f.movieId)
    if (idx >= 0) current[idx] = f; else current.push(f)
    await blobSaveFavorites(userId, current)
    return
  }
  return sqliteAddFavorite(userId, f)
}

export async function removeFavorite(userId: string, id: string): Promise<void> {
  if (isVercel && hasBlob) {
    const current = await blobListFavorites(userId)
    const next = current.filter(i => i.movieId !== id)
    await blobSaveFavorites(userId, next)
    return
  }
  return sqliteRemoveFavorite(userId, id)
}