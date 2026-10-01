import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors, ConfirmHost } from './components/ui';
import { refreshIncoming, useFriends } from './lib/friends';
import { supabase } from './lib/supabase';
import { runSync } from './lib/runSync';
import { useStore } from './store/useStore';
import CourseDetailScreen from './screens/CourseDetailScreen';
import CourseListScreen from './screens/CourseListScreen';
import FriendDetailScreen from './screens/FriendDetailScreen';
import FriendsScreen from './screens/FriendsScreen';
import ProfileScreen from './screens/ProfileScreen';
import ScorecardScreen from './screens/ScorecardScreen';
import StatsScreen, { RoundDetailScreen } from './screens/StatsScreen';

const Tabs = createBottomTabNavigator();
const Play = createNativeStackNavigator();
const Stats = createNativeStackNavigator();
const Friends = createNativeStackNavigator();

const PlayStack = () => (
  <Play.Navigator>
    <Play.Screen name="CourseList" component={CourseListScreen} options={{ title: 'Platzauswahl' }} />
    <Play.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: 'Platz' }} />
    <Play.Screen name="Scorecard" component={ScorecardScreen} options={{ title: 'Runde' }} />
  </Play.Navigator>
);
const StatsStack = () => (
  <Stats.Navigator>
    <Stats.Screen name="StatsHome" component={StatsScreen} options={{ title: 'Statistiken' }} />
    <Stats.Screen name="RoundDetail" component={RoundDetailScreen} options={{ title: 'Runde' }} />
  </Stats.Navigator>
);
const FriendsStack = () => (
  <Friends.Navigator>
    <Friends.Screen name="FriendsHome" component={FriendsScreen} options={{ title: 'Freunde' }} />
    <Friends.Screen name="FriendDetail" component={FriendDetailScreen} options={{ title: 'Spieler' }} />
  </Friends.Navigator>
);

/** Gleicht nach Anmeldung/App-Start Profil und Runden ab und fragt regelmässig nach neuen Freundschaftsanfragen. */
function BackgroundSync() {
  useEffect(() => {
    if (!supabase) return;
    const run = () => {
      void runSync();
      void refreshIncoming();
    };
    /** Name aus dem Google-Konto vorbelegen, wenn im Profil noch keiner steht. */
    const prefillName = (user?: { user_metadata?: Record<string, unknown> } | null) => {
      const full = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
      const st = useStore.getState();
      if (typeof full === 'string' && full && !st.profile.name) st.setProfile({ name: full });
    };
    supabase.auth.getSession().then(({ data }) => { if (data.session) { prefillName(data.session.user); run(); } });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) useFriends.setState({ incoming: 0 });
      else if (event === 'SIGNED_IN') { prefillName(session.user); run(); }
    });
    const timer = setInterval(() => void refreshIncoming(), 45000);
    return () => { data.subscription.unsubscribe(); clearInterval(timer); };
  }, []);
  return null;
}

export default function App() {
  const incoming = useFriends((s) => s.incoming);
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green }}>
          <Tabs.Screen name="Platz" component={PlayStack} />
          <Tabs.Screen name="Statistik" component={StatsStack} />
          <Tabs.Screen name="Freunde" component={FriendsStack} options={{ tabBarBadge: incoming > 0 ? incoming : undefined, tabBarBadgeStyle: { backgroundColor: colors.bad } }} />
          <Tabs.Screen name="Profil" component={ProfileScreen} options={{ headerShown: true }} />
        </Tabs.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
      <BackgroundSync />
      <ConfirmHost />
    </SafeAreaProvider>
  );
}
