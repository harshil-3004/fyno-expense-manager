import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import FynnFAB from '../components/fynn/FynnFAB';
import FynnChatScreen from '../screens/fynn/FynnChatScreen';

import PulseScreen from '../screens/pulse/PulseScreen';
import HistoryScreen from '../screens/transactions/HistoryScreen';
import AddTransactionScreen from '../screens/transactions/AddTransactionScreen';
import TransactionDetailScreen from '../screens/transactions/TransactionDetailScreen';
import EditTransactionScreen from '../screens/transactions/EditTransactionScreen';
import InsightsScreen from '../screens/insights/InsightsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/settings/ProfileScreen';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import HelpScreen from '../screens/settings/HelpScreen';
import PrivacyScreen from '../screens/settings/PrivacyScreen';
import AboutScreen from '../screens/settings/AboutScreen';
import BudgetScreen from '../screens/plan/BudgetScreen';
import GoalScreen from '../screens/plan/GoalScreen';
import ExportScreen from '../screens/settings/ExportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Custom tab bar with floating add button
const CustomTabBar = ({ state, descriptors, navigation }) => {
  const { colors, shadows, spacing, borderRadius, typography, fontSize } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: colors.tabBar,
          paddingBottom: insets.bottom || spacing.sm,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          ...shadows.md,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const isAddButton = route.name === 'Add';

        const iconMap = {
          Pulse: isFocused ? 'pulse' : 'pulse-outline',
          History: isFocused ? 'time' : 'time-outline',
          Add: 'add',
          Insights: isFocused ? 'bulb' : 'bulb-outline',
          Settings: isFocused ? 'settings' : 'settings-outline',
        };

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (isAddButton) {
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.addButton,
                {
                  backgroundColor: colors.accent,
                  width: 54,
                  height: 54,
                  borderRadius: 27,
                  marginTop: -20,
                  transform: [{ scale: pressed ? 0.9 : 1 }],
                  ...shadows.lg,
                },
              ]}
            >
              <Ionicons name="add" size={30} color={colors.primary} />
            </Pressable>
          );
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={styles.tabItem}>
            <Ionicons
              name={iconMap[route.name]}
              size={22}
              color={isFocused ? colors.tabBarActive : colors.tabBarInactive}
            />
            <View
              style={[
                styles.tabDot,
                {
                  backgroundColor: isFocused ? colors.tabBarActive : 'transparent',
                  marginTop: 4,
                },
              ]}
            />
          </Pressable>
        );
      })}
    </View>
  );
};

const TabNavigator = () => {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Pulse" component={PulseScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen
        name="Add"
        component={View}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddTransaction');
          },
        })}
      />
      <Tab.Screen name="Insights" component={InsightsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

const withFynn = (WrappedComponent) => {
  return (props) => (
    <View style={{ flex: 1 }}>
      <WrappedComponent {...props} />
      <FynnFAB />
    </View>
  );
};

const FynnTabs = withFynn(TabNavigator);
const FynnAddTransaction = withFynn(AddTransactionScreen);
const FynnTransactionDetail = withFynn(TransactionDetailScreen);
const FynnEditTransaction = withFynn(EditTransactionScreen);
const FynnProfile = withFynn(ProfileScreen);
const FynnEditProfile = withFynn(EditProfileScreen);
const FynnHelp = withFynn(HelpScreen);
const FynnPrivacy = withFynn(PrivacyScreen);
const FynnAbout = withFynn(AboutScreen);
const FynnBudget = withFynn(BudgetScreen);
const FynnGoal = withFynn(GoalScreen);
const FynnExport = withFynn(ExportScreen);

const MainNavigator = () => {
  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={FynnTabs} />
        <Stack.Screen
          name="AddTransaction"
          component={FynnAddTransaction}
          options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
        />
        <Stack.Screen
          name="TransactionDetail"
          component={FynnTransactionDetail}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="EditTransaction"
          component={FynnEditTransaction}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Profile"
          component={FynnProfile}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="EditProfile"
          component={FynnEditProfile}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Help"
          component={FynnHelp}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="Privacy"
          component={FynnPrivacy}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="About"
          component={FynnAbout}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="FynnChat"
          component={FynnChatScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="BudgetScreen"
          component={FynnBudget}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="GoalScreen"
          component={FynnGoal}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ExportScreen"
          component={FynnExport}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  addButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MainNavigator;
