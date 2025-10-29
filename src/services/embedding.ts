import { GoogleGenerativeAI } from "@google/generative-ai"

// Lightweight, dependency-free hashing-based embedding for dev/offline
function simpleHashEmbedding(text: string, dim = 128): number[] {
  const vec = new Array(dim).fill(0)
  const tokens = (text || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  for (const t of tokens) {
    let h = 2166136261
    for (let i = 0; i < t.length; i++) h = (h ^ t.charCodeAt(i)) * 16777619
    const idx = Math.abs(h) % dim
    vec[idx] += 1
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1
  return vec.map((v) => v / norm)
}

export async function embedText(text: string): Promise<number[]> {
  try {
    const key = process.env.GEMINI_API_KEY
    const useLocal = process.env.USE_LOCAL_EMBEDDINGS === "1" || process.env.NODE_ENV === "development"
    if (!key || useLocal) return simpleHashEmbedding(text)

    const genAI = new GoogleGenerativeAI(key)
    // text-embedding-004 returns 768-dim vector
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" }) as any
    const res = await (model.embedContent?.(text) ?? model.generateEmbedding?.({ content: text }))
    const values: number[] = res?.embedding?.values || res?.data?.[0]?.embedding || []
    if (!values.length) return simpleHashEmbedding(text)
    return values
  } catch {
    return simpleHashEmbedding(text)
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length)
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < len; i++) {
    const x = a[i] || 0
    const y = b[i] || 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom ? dot / denom : 0
}

export function averageVectors(vectors: number[][]): number[] {
  if (!vectors.length) return []
  const dim = vectors[0].length
  const acc = new Array(dim).fill(0)
  for (const v of vectors) for (let i = 0; i < dim; i++) acc[i] += v[i] || 0
  return acc.map((v) => v / vectors.length)
}
