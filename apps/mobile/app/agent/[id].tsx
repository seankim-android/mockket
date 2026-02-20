import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function AgentProfile() {
  const { id } = useLocalSearchParams<{ id: string }>()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Agent: {id}</Text>
    </View>
  )
}
