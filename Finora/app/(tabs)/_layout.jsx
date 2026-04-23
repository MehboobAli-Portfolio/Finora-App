import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
const TAB_COLOR = '#2563EB';
const INACTIVE = '#9CA3AF';
const TAB_ICONS = {
  index: require('../../assets/icons/home.png'),
  expenses: require('../../assets/icons/expense.png'),
  goals: require('../../assets/icons/goal.png'),
  invest: require('../../assets/icons/invest.png'),
  'salary-reality': require('../../assets/icons/salary.png'),
  ai: require('../../assets/icons/ai.png'),
};
function TabIcon({
  name,
  focused,
  route
}) {
  const iconSource = TAB_ICONS[route] || TAB_ICONS.index;
  
  return (
    <View style={{
      width: 56,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <View style={{
        width: 42,
        height: 42,
        borderRadius: 10,
        backgroundColor: '#FFFFFF',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Image 
          source={iconSource} 
          style={{ 
            width: 42, 
            height: 42, 
            backgroundColor: '#FFFFFF',
            opacity: 1,
            transform: [{ scale: 1.3 }]
          }} 
          resizeMode="contain"
        />
      </View>
    </View>
  );
}
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarStyle: {
      position: 'absolute',
      bottom: Math.max(insets.bottom, 12),
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
    tabBarHideOnKeyboard: true,
    tabBarVisibilityAnimationConfig: {
      show: { animation: 'timing', config: { duration: 0 } },
      hide: { animation: 'timing', config: { duration: 0 } },
    }
  }}>
      <Tabs.Screen name="index" options={{
      title: 'Home',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="index" />
    }} />
      <Tabs.Screen name="expenses" options={{
      title: 'Expenses',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="expenses" />
    }} />
      <Tabs.Screen name="goals" options={{
      title: 'Goals',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="goals" />
    }} />
      <Tabs.Screen name="invest" options={{
      title: 'Invest',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="invest" />
    }} />
      <Tabs.Screen name="salary-reality" options={{
      title: 'Salary',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="salary-reality" />
    }} />
      <Tabs.Screen name="ai" options={{
      title: 'Coach',
      tabBarIcon: ({
        focused
      }) => <TabIcon focused={focused} route="ai" />
    }} />
      <Tabs.Screen name="profile" options={{
      title: 'Profile',
      href: null
    }} />
    </Tabs>;
}