import { z } from 'zod'
import { listFavorites, addFavorite, type Fav } from './db'

function allowCors(req: any, res: any, methods: string) {
  const origin = req.headers?.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

async function parseJsonBody(req: any): Promise<any> {
  if (req.body) {
    try {
      return typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    } catch {}
  }
  const chunks: Buffer[] = []
  for await (const chunk of req as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  const raw = Buffer.concat(chunks).toString('utf-8')
  try {
    return JSON.parse(raw || '{}')
  } catch {
    return {}
  }
}

const FavSchema = z.object({
  movieId: z.string().min(1),
  title: z.string().min(1),
  posterUrl: z.string().min(1),
})

export default async function handler(req: any, res: any) {
  allowCors(req, res, 'GET, POST, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

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

  res.setHeader('Allow', 'GET, POST, OPTIONS')
  return res.status(405).json({ error: 'Method Not Allowed' })
}