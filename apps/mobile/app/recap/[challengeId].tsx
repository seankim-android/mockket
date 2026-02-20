import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function Recap() {
  const { challengeId } = useLocalSearchParams<{ challengeId: string }>()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Recap: {challengeId}</Text>
    </View>
  )
}
