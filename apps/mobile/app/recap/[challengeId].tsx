import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface Challenge {
  id: string
  user_id: string
  agent_id: string | null
  duration: string
  starting_balance: number
  status: string
  winner_id: string | null
  is_forfeited: boolean
  final_value: number | null
  return_pct: number | null
}

export default function Recap() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>()
  const router = useRouter()

  const { data: challenge, isLoading } = useQuery<Challenge>({
    queryKey: ['challenge', challengeId],
    queryFn: () => api.get<Challenge>(`/challenges/${challengeId}`),
  })

  if (isLoading || !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  const userWon = challenge.winner_id === challenge.user_id
  const isTie = challenge.status === 'completed' && !challenge.winner_id
  const resultColor = isTie ? tokens.colors.warning : userWon ? tokens.colors.positive : tokens.colors.negative

  return (
    <View style={styles.container}>
      {/* Result headline */}
      <View style={[styles.resultBadge, { backgroundColor: resultColor + '20', borderColor: resultColor }]}>
        <Text variant="heading" style={{ color: resultColor }}>
          {isTie ? "It's a Tie" : userWon ? 'You Won!' : 'You Lost'}
        </Text>
      </View>

      <Text variant="body" color="secondary" style={styles.sub}>
        {challenge.is_forfeited
          ? 'You forfeited this challenge.'
          : `vs ${challenge.agent_id ?? 'Friend'} · ${challenge.duration} challenge`}
      </Text>

      <View style={styles.card}>
        <Row label="Starting balance" value={`$${challenge.starting_balance.toLocaleString()}`} />
        {challenge.final_value != null && (
          <Row label="Final value" value={`$${challenge.final_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        )}
        {challenge.return_pct != null && (
          <Row
            label="Return"
            value={`${challenge.return_pct >= 0 ? '+' : ''}${Number(challenge.return_pct).toFixed(2)}%`}
            valueColor={challenge.return_pct >= 0 ? tokens.colors.positive : tokens.colors.negative}
          />
        )}
        <Row label="Status" value={challenge.status} />
      </View>

      <Text variant="caption" color="secondary" style={styles.agentQuote}>
        {challenge.agent_id === 'marcus-bull-chen'
          ? userWon
            ? '"Alright, you got me this time. But don\'t get comfortable."'
            : '"That\'s what I\'m talking about. Back to the books for you."'
          : ''}
      </Text>

      <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/(tabs)/challenges')}>
        <Text variant="label" style={{ color: '#fff' }}>Back to Challenges</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing[2] }}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant="caption" style={valueColor ? { color: valueColor } : undefined}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg.primary,
    padding: tokens.spacing[6],
    paddingTop: 80,
    alignItems: 'center',
  },
  centered: { flex: 1, backgroundColor: tokens.colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  resultBadge: {
    borderWidth: 1,
    borderRadius: tokens.radii.xl,
    paddingHorizontal: tokens.spacing[6],
    paddingVertical: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
  },
  sub: { textAlign: 'center', marginBottom: tokens.spacing[6] },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    width: '100%',
    marginBottom: tokens.spacing[4],
  },
  agentQuote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: tokens.spacing[8],
    paddingHorizontal: tokens.spacing[4],
  },
  homeBtn: {
    backgroundColor: tokens.colors.brand.default,
    borderRadius: tokens.radii.lg,
    paddingVertical: tokens.spacing[4],
    paddingHorizontal: tokens.spacing[8],
    width: '100%',
    alignItems: 'center',
  },
})
