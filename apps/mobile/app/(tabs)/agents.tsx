import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { Text, Screen } from '@/components/primitives'
import { useAgents } from '@/features/agents'
import { api } from '@/lib/api/client'
import { tokens } from '@/design/tokens'

interface AgentHire {
  id: string
  agent_id: string
  allocated_cash: number
  mode: string
  is_paused: boolean
}

const RISK_COLORS: Record<string, string> = {
  low: tokens.colors.positive,
  medium: tokens.colors.warning,
  high: tokens.colors.negative,
  degen: '#A855F7',
}

export default function AgentsScreen() {
  const router = useRouter()
  const { data: agents = [] } = useAgents()

  const { data: hires = [] } = useQuery<AgentHire[]>({
    queryKey: ['agent-hires'],
    queryFn: () => api.get<AgentHire[]>('/agent-hires'),
  })

  const hiredIds = new Set(hires.map((h) => h.agent_id))

  return (
    <Screen>
    <ScrollView contentContainerStyle={styles.content}>
      <Text variant="heading" style={styles.pageTitle}>Agents</Text>

      {/* Hired section */}
      {hires.length > 0 && (
        <>
          <Text variant="label" color="secondary" style={styles.sectionTitle}>Hired</Text>
          {hires.map((hire) => {
            const agent = agents.find((a) => a.id === hire.agent_id)
            return (
              <TouchableOpacity
                key={hire.id}
                style={styles.card}
                onPress={() => router.push(`/agent/${hire.agent_id}`)}
              >
                <View style={styles.cardRow}>
                  <Text variant="label">{agent?.name ?? hire.agent_id}</Text>
                  {hire.is_paused && (
                    <View style={styles.pausedBadge}>
                      <Text variant="caption" style={{ color: tokens.colors.warning }}>Paused</Text>
                    </View>
                  )}
                </View>
                <Text variant="caption" color="secondary">
                  ${hire.allocated_cash.toLocaleString()} · {hire.mode}
                </Text>
              </TouchableOpacity>
            )
          })}
        </>
      )}

      {/* Marketplace */}
      <Text variant="label" color="secondary" style={styles.sectionTitle}>Marketplace</Text>
      {agents.map((agent) => (
        <TouchableOpacity
          key={agent.id}
          style={styles.card}
          onPress={() => router.push(`/agent/${agent.id}`)}
        >
          <View style={styles.cardRow}>
            <Text variant="label">{agent.name}</Text>
            <View style={[styles.riskBadge, { borderColor: RISK_COLORS[agent.riskLevel] ?? tokens.colors.text.muted }]}>
              <Text variant="caption" style={{ color: RISK_COLORS[agent.riskLevel] ?? tokens.colors.text.muted }}>
                {agent.riskLevel}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="secondary" style={{ marginTop: tokens.spacing[1] }}>
            {agent.strategy}
          </Text>
          <Text variant="caption" color="secondary" style={{ marginTop: tokens.spacing[1] }}>
            {agent.assetClasses.join(' · ')} · {agent.rebalanceInterval}
            {hiredIds.has(agent.id) ? ' · Hired' : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.colors.bg.primary },
  content: { padding: tokens.spacing[4] },
  pageTitle: { marginBottom: tokens.spacing[6] },
  sectionTitle: { marginBottom: tokens.spacing[3], textTransform: 'uppercase', letterSpacing: 1 },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pausedBadge: {
    backgroundColor: '#FBBF2420',
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: 2,
  },
  riskBadge: {
    borderWidth: 1,
    borderRadius: tokens.radii.full,
    paddingHorizontal: tokens.spacing[2],
    paddingVertical: 2,
  },
})
