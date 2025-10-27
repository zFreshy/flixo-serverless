import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

export type Fav = { movieId: string; title: string; posterUrl: string }

const isVercel = !!process.env.VERCEL
const baseDir = isVercel ? path.join('/tmp', 'favorites') : path.resolve(process.cwd(), 'server', 'data')
const dbPath = path.join(baseDir, 'favorites.db')
fs.mkdirSync(baseDir, { recursive: true })

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS favorites (
  movie_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  poster_url TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);
`)

export function listFavorites(): Fav[] {
  return db
    .prepare('SELECT movie_id AS movieId, title, poster_url AS posterUrl FROM favorites ORDER BY created_at DESC')
    .all() as Fav[]
}

export function addFavorite(f: Fav): void {
  const nowSec = Math.floor(Date.now() / 1000)
  db
    .prepare('INSERT OR REPLACE INTO favorites (movie_id, title, poster_url, created_at) VALUES (?, ?, ?, ?)')
    .run(f.movieId, f.title, f.posterUrl, nowSec)
}

export function removeFavorite(id: string): void {
  db.prepare('DELETE FROM favorites WHERE movie_id = ?').run(id)
}