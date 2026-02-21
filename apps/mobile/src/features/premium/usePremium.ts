import { useMutation, useQueryClient } from '@tanstack/react-query'
import { purchasePremium, purchasePortfolioReset } from '@/lib/purchases/client'
import { api } from '@/lib/api/client'

export function usePremium() {
  const queryClient = useQueryClient()

  const { mutateAsync: buyPremium, isPending: isBuyingPremium } = useMutation({
    mutationFn: (packageId: 'monthly' | 'annual') => purchasePremium(packageId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['user-me'] }),
  })

  const { mutateAsync: resetPortfolio, isPending: isResetting } = useMutation({
    mutationFn: async () => {
      await purchasePortfolioReset()
      return api.post('/portfolio/reset', {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
      queryClient.invalidateQueries({ queryKey: ['trades'] })
      queryClient.invalidateQueries({ queryKey: ['user-me'] })
    },
  })

  return { buyPremium, isBuyingPremium, resetPortfolio, isResetting }
}
