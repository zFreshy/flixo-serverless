import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
import { kv } from '@vercel/kv'

export type Fav = { movieId: string; title: string; posterUrl: string }

// Determine environment and storage backend
const isVercel = !!process.env.VERCEL
const hasKV = !!(process.env.KV_REST_API_URL || process.env.KV_URL)

// SQLite (dev/local) setup with per-user table
const baseDir = path.resolve(process.cwd(), 'server', 'data')
fs.mkdirSync(baseDir, { recursive: true })
const dbPath = path.join(baseDir, 'favorites.db')
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

// KV helpers (production)
async function kvListFavorites(userId: string): Promise<Fav[]> {
  const raw = await kv.hgetall<Record<string, string>>(`favorites:${userId}`)
  if (!raw) return []
  return Object.values(raw).map(v => {
    try { return JSON.parse(v) as Fav } catch { return null }
  }).filter(Boolean) as Fav[]
}

async function kvAddFavorite(userId: string, f: Fav): Promise<void> {
  await kv.hset(`favorites:${userId}` as any, { [f.movieId]: JSON.stringify(f) } as any)
}

async function kvRemoveFavorite(userId: string, movieId: string): Promise<void> {
  await kv.hdel(`favorites:${userId}` as any, movieId as any)
}

// SQLite helpers (dev)
function sqliteListFavorites(userId: string): Fav[] {
  return db
    .prepare('SELECT movie_id AS movieId, title, poster_url AS posterUrl FROM favorites_user WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Fav[]
}

function sqliteAddFavorite(userId: string, f: Fav): void {
  const nowSec = Math.floor(Date.now() / 1000)
  db
    .prepare('INSERT INTO favorites_user (user_id, movie_id, title, poster_url, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id, movie_id) DO UPDATE SET title=excluded.title, poster_url=excluded.poster_url, created_at=excluded.created_at')
    .run(userId, f.movieId, f.title, f.posterUrl, nowSec)
}

function sqliteRemoveFavorite(userId: string, id: string): void {
  db.prepare('DELETE FROM favorites_user WHERE user_id = ? AND movie_id = ?').run(userId, id)
}

// Public API selecting backend
export async function listFavorites(userId: string): Promise<Fav[]> {
  if (isVercel && hasKV) return kvListFavorites(userId)
  return sqliteListFavorites(userId)
}

export async function addFavorite(userId: string, f: Fav): Promise<void> {
  if (isVercel && hasKV) return kvAddFavorite(userId, f)
  return sqliteAddFavorite(userId, f)
}

export async function removeFavorite(userId: string, id: string): Promise<void> {
  if (isVercel && hasKV) return kvRemoveFavorite(userId, id)
  return sqliteRemoveFavorite(userId, id)
}