import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="markets" options={{ title: 'Markets' }} />
      <Tabs.Screen name="portfolio" options={{ title: 'Portfolio' }} />
      <Tabs.Screen name="agents" options={{ title: 'Agents' }} />
      <Tabs.Screen name="challenges" options={{ title: 'Challenges' }} />
    </Tabs>
  )
}
