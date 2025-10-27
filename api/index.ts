import express from 'express'
import { z } from 'zod'
import { listFavorites, addFavorite, removeFavorite, type Fav } from './db'

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/api/favorites', (_req, res) => {
  const items = listFavorites()
  res.json(items)
})

const FavSchema = z.object({
  movieId: z.string().min(1),
  title: z.string().min(1),
  posterUrl: z.string().min(1),
})

app.post('/api/favorites', (req, res) => {
  const parsed = FavSchema.safeParse(req.body as Fav)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }
  addFavorite(parsed.data)
  res.status(201).json({ ok: true })
})

app.delete('/api/favorites/:movieId', (req, res) => {
  const id = req.params.movieId
  if (!id) return res.status(400).json({ error: 'movieId required' })
  removeFavorite(id)
  res.json({ ok: true })
})

export default (req: any, res: any) => {
  return (app as any)(req, res)
}