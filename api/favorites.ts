import { listFavorites } from './db'

function allowCors(req: any, res: any, methods: string) {
  const origin = req.headers?.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', methods)
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
}



export default async function handler(req: any, res: any) {
  allowCors(req, res, 'GET, OPTIONS')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    const items = listFavorites()
    return res.status(200).json(items)
  }


  res.setHeader('Allow', 'GET, OPTIONS')
  return res.status(405).json({ error: 'Method Not Allowed' })
}