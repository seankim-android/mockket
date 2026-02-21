import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Text } from '@/components/primitives'
import { useFtue } from './useFtue'
import { tokens } from '@/design/tokens'

interface MissionCardsProps {
  userCreatedAt?: string
}

export function MissionCards({ userCreatedAt }: MissionCardsProps) {
  const router = useRouter()
  const { progress, markStep, allMissionsComplete, shouldShowDay2Card } = useFtue()

  if (!progress || allMissionsComplete) return null

  const missions: Array<{
    done: boolean
    title: string
    description: string
    cta: string
    action: () => void
  }> = [
    {
      done: progress.viewedMarcusProfile,
      title: "Meet Marcus",
      description: "Check out your AI trading sidekick and see what he's been up to.",
      cta: "View Marcus",
      action: () => {
        router.push('/agent/marcus-bull-chen')
        markStep({ viewedMarcusProfile: true })
      },
    },
    {
      done: progress.madeFirstTrade,
      title: "Make your first trade",
      description: "Pick a stock and place your first paper trade.",
      cta: "Go to Markets",
      // madeFirstTrade is set by first-trade-moment.tsx after trade executes — no markStep here
      action: () => router.push('/(tabs)/markets'),
    },
    {
      done: progress.startedChallenge,
      title: "Start a challenge",
      description: "Compete against Marcus or a friend for bragging rights.",
      cta: "View Challenges",
      // startedChallenge is set server-side in POST /challenges — no markStep here
      action: () => router.push('/(tabs)/challenges'),
    },
  ]

  const incompleteMissions = missions.filter((m) => !m.done)

  return (
    <View style={styles.container}>
      <Text variant="label" color="secondary" style={styles.sectionTitle}>
        GETTING STARTED
      </Text>
      {incompleteMissions.map((mission, i) => (
        <TouchableOpacity key={i} style={styles.card} onPress={mission.action} activeOpacity={0.7}>
          <View style={styles.cardContent}>
            <Text variant="label">{mission.title}</Text>
            <Text variant="caption" color="secondary" style={styles.desc}>
              {mission.description}
            </Text>
          </View>
          <View style={styles.ctaTag}>
            <Text variant="caption" style={{ color: tokens.colors.brand.default }}>
              {mission.cta} →
            </Text>
          </View>
        </TouchableOpacity>
      ))}

      {shouldShowDay2Card(userCreatedAt) && (
        <View style={[styles.card, styles.day2Card]}>
          <Text variant="label">Welcome back!</Text>
          <Text variant="caption" color="secondary" style={styles.desc}>
            Ready to start a challenge? Put your portfolio to the test.
          </Text>
          <TouchableOpacity
            onPress={() => {
              markStep({ day2CardShown: true })
              router.push('/(tabs)/challenges')
            }}
          >
            <Text variant="caption" style={{ color: tokens.colors.brand.default }}>
              Start a challenge →
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: tokens.spacing[4],
    marginBottom: tokens.spacing[4],
  },
  sectionTitle: {
    marginBottom: tokens.spacing[3],
    letterSpacing: 1,
  },
  card: {
    backgroundColor: tokens.colors.bg.secondary,
    borderRadius: tokens.radii.lg,
    padding: tokens.spacing[4],
    marginBottom: tokens.spacing[3],
    borderLeftWidth: 3,
    borderLeftColor: tokens.colors.brand.default,
  },
  cardContent: {
    marginBottom: tokens.spacing[3],
  },
  desc: {
    marginTop: tokens.spacing[1],
    lineHeight: 18,
  },
  ctaTag: {
    alignSelf: 'flex-start',
  },
  day2Card: {
    borderLeftColor: tokens.colors.warning,
  },
})
