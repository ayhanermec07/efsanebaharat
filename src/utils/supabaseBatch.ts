const DEFAULT_BATCH_SIZE = 50
const MAX_CONCURRENT_BATCHES = 4
const REQUEST_TIMEOUT_MS = 15_000

type BatchQueryResult<T> = {
  data: T[] | null
  error?: unknown
}

export async function fetchInBatches<T>(
  ids: Array<string | null | undefined>,
  queryFactory: (batchIds: string[]) => PromiseLike<BatchQueryResult<T>>,
  batchSize = DEFAULT_BATCH_SIZE
): Promise<{ data: T[]; error: unknown | null }> {
  const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))]

  if (uniqueIds.length === 0) {
    return { data: [], error: null }
  }

  const batches: string[][] = []

  for (let start = 0; start < uniqueIds.length; start += batchSize) {
    batches.push(uniqueIds.slice(start, start + batchSize))
  }

  const data: T[] = []

  for (let start = 0; start < batches.length; start += MAX_CONCURRENT_BATCHES) {
    const currentBatches = batches.slice(start, start + MAX_CONCURRENT_BATCHES)
    const results = await Promise.all(
      currentBatches.map(async (batchIds) => {
        const timeout = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error('Ürün verisi zamanında yüklenemedi.')), REQUEST_TIMEOUT_MS)
        })

        return Promise.race([Promise.resolve(queryFactory(batchIds)), timeout])
      })
    )

    for (const result of results) {
      if (result.error) {
        return { data, error: result.error }
      }

      if (result.data) {
        data.push(...result.data)
      }
    }
  }

  return { data, error: null }
}
