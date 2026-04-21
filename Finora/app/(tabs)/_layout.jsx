import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TAB_COLOR = '#2563EB';
const INACTIVE = '#9CA3AF';
function TabIcon({
  name,
  focused
}) {
  return <View style={{
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    ...(focused && { backgroundColor: '#EFF6FF' })
  }}>
      <Ionicons name={focused ? name : `${name}-outline`} size={24} color={focused ? TAB_COLOR : INACTIVE} />
    </View>;
}
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarStyle: {
      position: 'absolute',
      bottom: Platform.OS === 'android' ? Math.max(insets.bottom + 16, 16) : Math.max(insets.bottom, 24),
      left: 16,
      right: 16,
      height: 68,
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      elevation: 10,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 8
      },
      shadowOpacity: 0.12,
      shadowRadius: 16,
      paddingBottom: 0,
      borderTopWidth: 0
    },
    tabBarItemStyle: {
      paddingVertical: 10
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '700',
      marginTop: 2,
      marginBottom: 4
    },
    tabBarActiveTintColor: TAB_COLOR,
    tabBarInactiveTintColor: INACTIVE,
    tabBarHideOnKeyboard: true
  }}>
      <Tabs.Screen name="index" options={{
      title: 'Home',
      tabBarIcon: ({
        focused
      }) => <TabIcon name="home" focused={focused} />
    }} />
      <Tabs.Screen name="expenses" options={{
      title: 'Expenses',
      tabBarIcon: ({
        focused
      }) => <TabIcon name="receipt" focused={focused} />
    }} />
      <Tabs.Screen name="goals" options={{
      title: 'Goals',
      tabBarIcon: ({
        focused
      }) => <TabIcon name="flag" focused={focused} />
    }} />
      <Tabs.Screen name="invest" options={{
      title: 'Invest',
      tabBarIcon: ({
        focused
      }) => <TabIcon name="trending-up" focused={focused} />
    }} />
      <Tabs.Screen name="salary-reality" options={{
      title: 'Salary',
      tabBarIcon: ({
        focused
      }) => <TabIcon name="cash" focused={focused} />
    }} />
      <Tabs.Screen name="ai" options={{
      title: 'Coach',
      tabBarStyle: {
        display: 'none'
      },
      tabBarIcon: ({
        focused
      }) => <TabIcon name="sparkles" focused={focused} />
    }} />
      <Tabs.Screen name="profile" options={{
      title: 'Profile',
      href: null
    }} />
    </Tabs>;
}