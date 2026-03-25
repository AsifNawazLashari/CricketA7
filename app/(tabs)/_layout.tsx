import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({ name, color, size }: { name: IoniconName; color: string; size: number }) {
  return <Ionicons name={name} color={color} size={size} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, // Each screen manages its own header
        tabBarStyle: {
          backgroundColor: Colors.bg,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 8,
          paddingTop: 4,
        },
        tabBarActiveTintColor: Colors.cyan,
        tabBarInactiveTintColor: Colors.muted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.3, fontFamily: 'Rajdhani-SemiBold' },
      }}
    >
      <Tabs.Screen
        name="HomeScreen"
        options={{
          title: 'HOME',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <TabIcon name="home" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="FixtureScreen"
        options={{
          title: 'FIXTURES',
          tabBarLabel: 'Fixtures',
          tabBarIcon: ({ color, size }) => <TabIcon name="calendar" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="TeamsScreen"
        options={{
          title: 'TEAMS',
          tabBarLabel: 'Teams',
          tabBarIcon: ({ color, size }) => <TabIcon name="people" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="ScoringScreen"
        options={{
          title: 'SCORE',
          tabBarLabel: 'Score',
          tabBarIcon: ({ color, size }) => <TabIcon name="radio-button-on" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="StatsScreen"
        options={{
          title: 'STATS',
          tabBarLabel: 'Stats',
          tabBarIcon: ({ color, size }) => <TabIcon name="bar-chart" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="ManageScreen"
        options={{
          title: 'MANAGE',
          tabBarLabel: 'Manage',
          tabBarIcon: ({ color, size }) => <TabIcon name="settings" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="CommentaryScreen"
        options={{
          title: 'COMMENTARY',
          tabBarLabel: 'Commentary',
          tabBarIcon: ({ color, size }) => <TabIcon name="chatbubbles" color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="AboutScreen"
        options={{
          title: 'ABOUT',
          tabBarLabel: 'About',
          tabBarIcon: ({ color, size }) => <TabIcon name="information-circle" color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
