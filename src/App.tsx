import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { colors } from './components/ui';
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

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tabs.Navigator screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.green }}>
          <Tabs.Screen name="Platz" component={PlayStack} />
          <Tabs.Screen name="Statistik" component={StatsStack} />
          <Tabs.Screen name="Freunde" component={FriendsStack} />
          <Tabs.Screen name="Profil" component={ProfileScreen} options={{ headerShown: true }} />
        </Tabs.Navigator>
        <StatusBar style="auto" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
