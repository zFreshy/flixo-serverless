import { z } from 'zod'
import { listFavorites, addFavorite, type Fav } from '../db'

async function parseJsonBody(req: any): Promise<any> {
  // Preferir o body já parseado se existir
  if (req.body) {
    if (typeof req.body === 'string') {
      try { return JSON.parse(req.body) } catch { return {} }
    }
    return req.body
  }
  // Fallback: ler o stream manualmente
  const chunks: Buffer[] = []
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf-8')
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

const FavSchema = z.object({
  movieId: z.string().min(1),
  title: z.string().min(1),
  posterUrl: z.string().min(1),
})

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const items = listFavorites()
    return res.status(200).json(items)
  }

  if (req.method === 'POST') {
    const body = await parseJsonBody(req)
    const parsed = FavSchema.safeParse(body as Fav)
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() })
    }
    addFavorite(parsed.data)
    return res.status(201).json({ ok: true })
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method Not Allowed' })
}