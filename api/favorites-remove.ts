import { removeFavorite } from './db'

function allowCors(req: any, res: any, methods: string) {
  const origin = req.headers?.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Methods', methods)
  const reqHeaders = (req.headers['access-control-request-headers'] as string | undefined) || 'Content-Type, X-User-Id'
  res.setHeader('Access-Control-Allow-Headers', reqHeaders)
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

export default async function handler(req: any, res: any) {
  allowCors(req, res, 'DELETE, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE, OPTIONS')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }
  try {
    const userId = (req.headers['x-user-id'] as string | undefined) || (req.query?.userId as string | undefined)
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId required' })
    }
    const q = req.query?.movieId as string | undefined
    const body = await parseJsonBody(req)
    const id = (q || body?.movieId) as string | undefined
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'movieId required' })
    }
    await removeFavorite(userId, id)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    console.error('favorites-remove error:', err)
    return res.status(500).json({ error: 'Internal Server Error', message: err?.message || String(err) })
  }
}