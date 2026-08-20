import { useCallback, useEffect, useRef, useState } from 'react'
import type { BattlePage } from '../api/client.js'

export interface DetailBattleRecordState<T> {
  battles: T[]
  error: string | null
  nextCursor: string | null
  status: 'loading' | 'ready' | 'error'
}

export function useDetailBattleRecords<T>(
  loadPage: (cursor: string | null, signal: AbortSignal) => Promise<{ battles: T[]; next_cursor: string | null }>
): DetailBattleRecordState<T> & { loadMore: () => void; retry: () => void } {
  const [retryKey, setRetryKey] = useState(0)
  const [state, setState] = useState<DetailBattleRecordState<T>>({
    battles: [],
    error: null,
    nextCursor: null,
    status: 'loading'
  })
  const loadMoreController = useRef<AbortController | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadMoreController.current?.abort()
    setState({ battles: [], error: null, nextCursor: null, status: 'loading' })
    void loadPage(null, controller.signal).then(
      (page) => {
        if (!controller.signal.aborted) {
          setState({ battles: page.battles, error: null, nextCursor: page.next_cursor, status: 'ready' })
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState({ battles: [], error: errorMessage(error), nextCursor: null, status: 'error' })
        }
      }
    )
    return () => {
      controller.abort()
      loadMoreController.current?.abort()
    }
  }, [loadPage, retryKey])

  const loadMore = useCallback(() => {
    if (state.status === 'loading' || state.nextCursor === null) return
    const controller = new AbortController()
    loadMoreController.current?.abort()
    loadMoreController.current = controller
    setState((current) => ({ ...current, error: null, status: 'loading' }))
    void loadPage(state.nextCursor, controller.signal).then(
      (page) => {
        if (!controller.signal.aborted) {
          setState((current) => ({
            battles: [...current.battles, ...page.battles],
            error: null,
            nextCursor: page.next_cursor,
            status: 'ready'
          }))
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setState((current) => ({ ...current, error: errorMessage(error), status: 'ready' }))
        }
      }
    )
  }, [loadPage, state.nextCursor, state.status])

  return { ...state, loadMore, retry: () => setRetryKey((value) => value + 1) }
}

export function mapBattlePage<T>(page: BattlePage, mapper: (battle: BattlePage['battles'][number]) => T | null) {
  return {
    battles: page.battles.flatMap((battle) => {
      const mapped = mapper(battle)
      return mapped === null ? [] : [mapped]
    }),
    next_cursor: page.next_cursor
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : '对战记录加载失败'
}
