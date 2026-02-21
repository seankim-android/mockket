import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface FtueProgress {
  viewedMarcusProfile: boolean
  madeFirstTrade: boolean
  startedChallenge: boolean
  firstTradeAnnotationShown: boolean
  agentIntroSent: boolean
  day2CardShown: boolean
}

export function useFtue() {
  const queryClient = useQueryClient()

  const { data: progress, isLoading } = useQuery<FtueProgress>({
    queryKey: ['ftue'],
    queryFn: () => api.get<FtueProgress>('/users/ftue'),
    staleTime: 60_000,
  })

  const { mutate: markStep } = useMutation({
    mutationFn: (patch: Partial<FtueProgress>) => api.patch('/users/ftue', patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: ['ftue'] })
      const prev = queryClient.getQueryData<FtueProgress>(['ftue'])
      queryClient.setQueryData<FtueProgress>(['ftue'], (old) =>
        old ? { ...old, ...patch } : (patch as FtueProgress)
      )
      return { prev }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['ftue'], ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['ftue'] }),
  })

  const allMissionsComplete = progress
    ? progress.viewedMarcusProfile &&
      progress.madeFirstTrade &&
      progress.startedChallenge
    : false

  // Day 2: user created account yesterday or earlier and no challenge yet
  function shouldShowDay2Card(createdAt?: string): boolean {
    if (!createdAt || progress?.day2CardShown || progress?.startedChallenge) return false
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 1
  }

  return { progress, isLoading, markStep, allMissionsComplete, shouldShowDay2Card }
}
