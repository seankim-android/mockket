import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'

export interface FtueProgress {
  mission1_agent_viewed: boolean    // card 1: viewed Marcus profile
  mission1_trade_done: boolean      // card 2: first trade complete
  mission1_challenge_done: boolean  // card 3: first challenge created
  first_trade_annotation_shown: boolean
  agent_intro_shown: boolean
  day2_card_shown: boolean
}

export function useFtue() {
  const queryClient = useQueryClient()

  const { data: progress, isLoading } = useQuery<FtueProgress>({
    queryKey: ['ftue'],
    queryFn: () => api.get<FtueProgress>('/ftue'),
    staleTime: 60_000,
  })

  const { mutate: markStep } = useMutation({
    mutationFn: (patch: Partial<FtueProgress>) => api.patch('/ftue', patch),
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
    ? progress.mission1_agent_viewed &&
      progress.mission1_trade_done &&
      progress.mission1_challenge_done
    : false

  // Day 2: user created account yesterday or earlier and no challenge yet
  function shouldShowDay2Card(createdAt?: string): boolean {
    if (!createdAt || progress?.day2_card_shown || progress?.mission1_challenge_done) return false
    const created = new Date(createdAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays >= 1
  }

  return { progress, isLoading, markStep, allMissionsComplete, shouldShowDay2Card }
}
