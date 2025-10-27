import { removeFavorite } from '../db'

function allowCors(req: any, res: any, methods: string) {
  const origin = req.headers?.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}

export default async function handler(req: any, res: any) {
  allowCors(req, res, 'DELETE, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE, OPTIONS')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  const raw = (req.query?.movieId ?? req.params?.movieId) as string | string[] | undefined
  const movieId = Array.isArray(raw) ? raw[0] : raw

  if (!movieId || typeof movieId !== 'string') {
    return res.status(400).json({ error: 'movieId required' })
  }

  removeFavorite(movieId)
  return res.status(200).json({ ok: true })
}