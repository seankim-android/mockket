import { useLocalSearchParams } from 'expo-router'
import { View, Text } from 'react-native'

export default function Trade() {
  const { ticker } = useLocalSearchParams<{ ticker: string }>()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Trade: {ticker}</Text>
    </View>
  )
}
