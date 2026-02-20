import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface Challenge {
  id: string
  agent_id: string | null
  opponent_user_id: string | null
  duration: string
  starting_balance: number
  status: string
  ends_at: string | null
  winner_id: string | null
  invite_token: string | null
}

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data: challenge, isLoading } = useQuery<Challenge>({
    queryKey: ['challenge', id],
    queryFn: () => api.get<Challenge>(`/challenges/${id}`),
  })

  if (isLoading || !challenge) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  const isCompleted = challenge.status === 'completed' || challenge.status === 'forfeited'

  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>
        vs {challenge.agent_id ?? 'Friend'}
      </Text>

      <View style={styles.card}>
        <Row label="Duration" value={challenge.duration} />
        <Row label="Starting balance" value={`$${challenge.starting_balance.toLocaleString()}`} />
        <Row label="Status" value={challenge.status} />
        {challenge.ends_at && (
          <Row label="Ends" value={new Date(challenge.ends_at).toLocaleDateString()} />
        )}
      </View>

      {challenge.invite_token && challenge.status === 'pending' && (
        <View style={styles.inviteCard}>
          <Text variant="label" style={{ marginBottom: tokens.spacing[2] }}>Invite a friend</Text>
          <Text variant="caption" color="secondary">
            Share this link: https://mockket.app/challenge/invite/{challenge.invite_token}
          </Text>
        </View>
      )}

      {isCompleted && (
        <TouchableOpacity
          style={styles.recapBtn}
          onPress={() => router.push(`/recap/${id}`)}
        >
          <Text variant="label" style={{ color: '#fff' }}>View Recap</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant="caption">{value}</Text>
    </View>
  )
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing[2] },
})

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary, padding: tokens.spacing[4], paddingTop: 60 },
  centered: { flex: 1, backgroundColor: tokens.colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: tokens.spacing[6] },
  card: { backgroundColor: tokens.colors.bg.secondary, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], marginBottom: tokens.spacing[4] },
  inviteCard: { backgroundColor: tokens.colors.bg.secondary, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], marginBottom: tokens.spacing[4], borderLeftWidth: 3, borderLeftColor: tokens.colors.brand.default },
  recapBtn: { backgroundColor: tokens.colors.brand.default, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], alignItems: 'center' },
})
