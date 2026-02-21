import { Tabs } from 'expo-router'
import { Home, TrendingUp, Users, Trophy, Activity, PieChart } from 'lucide-react-native'
import { tokens } from '@/design/tokens'

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.brand.default,
        tabBarInactiveTintColor: tokens.colors.text.muted,
        tabBarStyle: {
          backgroundColor: tokens.colors.bg.secondary,
          borderTopColor: tokens.colors.border.subtle,
          borderTopWidth: 1,
        },
      }}
    >
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
        name="activity"
        options={{ title: 'Activity', tabBarIcon: ({ color }) => <Activity color={color} size={22} /> }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{ title: 'Portfolio', tabBarIcon: ({ color }) => <PieChart color={color} size={22} /> }}
      />
    </Tabs>
  )
}
