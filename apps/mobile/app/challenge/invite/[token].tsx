import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Text } from '@/components/primitives'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface ChallengePreview {
  id: string
  user_id: string
  duration: string
  starting_balance: number
  status: string
  created_at: string
}

export default function ChallengeInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const router = useRouter()

  const { data: preview, isLoading } = useQuery<ChallengePreview>({
    queryKey: ['challenge-invite', token],
    queryFn: () => api.get<ChallengePreview>(`/challenges/invite/${token}`),
  })

  const { mutate: accept, isPending } = useMutation({
    mutationFn: () => api.post(`/challenges/invite/${token}/accept`, {}),
    onSuccess: () => router.replace('/(tabs)/challenges'),
  })

  if (isLoading || !preview) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={tokens.colors.brand.default} />
      </View>
    )
  }

  if (preview.status !== 'pending') {
    return (
      <View style={styles.centered}>
        <Text variant="body" color="secondary">This invite has expired or already been accepted.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text variant="heading" style={styles.title}>Challenge Invite</Text>
      <Text variant="body" color="secondary" style={styles.sub}>
        You've been challenged to a paper trading competition!
      </Text>

      <View style={styles.card}>
        <Row label="Duration" value={preview.duration} />
        <Row label="Starting balance" value={`$${preview.starting_balance.toLocaleString()}`} />
      </View>

      <TouchableOpacity
        style={[styles.acceptBtn, isPending && { opacity: 0.6 }]}
        onPress={() => accept()}
        disabled={isPending}
      >
        {isPending ? <ActivityIndicator color="#fff" /> : <Text variant="label" style={{ color: '#fff' }}>Accept Challenge</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.declineBtn} onPress={() => router.back()}>
        <Text variant="label" color="secondary">Decline</Text>
      </TouchableOpacity>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: tokens.spacing[2] }}>
      <Text variant="caption" color="secondary">{label}</Text>
      <Text variant="caption">{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary, padding: tokens.spacing[6], paddingTop: 80 },
  centered: { flex: 1, backgroundColor: tokens.colors.bg.primary, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: tokens.spacing[3] },
  sub: { marginBottom: tokens.spacing[6] },
  card: { backgroundColor: tokens.colors.bg.secondary, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], marginBottom: tokens.spacing[6] },
  acceptBtn: { backgroundColor: tokens.colors.brand.default, borderRadius: tokens.radii.lg, padding: tokens.spacing[4], alignItems: 'center', marginBottom: tokens.spacing[3] },
  declineBtn: { padding: tokens.spacing[4], alignItems: 'center' },
})
