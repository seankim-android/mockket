import { Tabs } from 'expo-router'
import { Home, TrendingUp, Users, Trophy, PieChart } from 'lucide-react-native'

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: '#6366F1' }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Home', tabBarIcon: ({ color }) => <Home color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="markets"
        options={{ title: 'Markets', tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="agents"
        options={{ title: 'Agents', tabBarIcon: ({ color }) => <Users color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="challenges"
        options={{ title: 'Challenges', tabBarIcon: ({ color }) => <Trophy color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: 'Portfolio', tabBarIcon: ({ color }) => <PieChart color={color} size={22} /> }}
      />
    </Tabs>
  )
}
