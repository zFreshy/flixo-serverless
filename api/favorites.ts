import { listFavorites } from './db'

function allowCors(req: any, res: any, methods: string) {
  const origin = req.headers?.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', methods)
  const reqHeaders = (req.headers['access-control-request-headers'] as string | undefined) || 'Content-Type, X-User-Id'
  res.setHeader('Access-Control-Allow-Headers', reqHeaders)
}

export default async function handler(req: any, res: any) {
  allowCors(req, res, 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    try {
      const userId = (req.headers['x-user-id'] as string | undefined) || (req.query?.userId as string | undefined)
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'userId required' })
      }
      const items = await listFavorites(userId)
      return res.status(200).json(items)
    } catch (err: any) {
      console.error('favorites list error:', err)
      return res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) })
    }
  }

  res.setHeader('Allow', 'GET, OPTIONS')
  return res.status(405).json({ error: 'Method Not Allowed' })
}