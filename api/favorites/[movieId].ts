import { removeFavorite } from '../db'

export default async function handler(req: any, res: any) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE')
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