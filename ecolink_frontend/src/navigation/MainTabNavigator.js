import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CommunicationScreen from '../screens/CommunicationScreen';
import Profile from '../screens/Profile';
import AIchatScreen from '../screens/AIchatScreen';
import QuizScreen from '../screens/QuizScreen';
import HomeContent from '../components/HomeComponent';
import ProfileStackNavigator from './ProfileStackNavigator';
import { Ionicons } from '@expo/vector-icons';
import colors from '../colors';


const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size, focused }) => {
          let iconName;
          if (route.name === '홈') iconName = 'home-outline';
          else if (route.name === '소통') iconName = 'chatbubble-ellipses-outline';
          else if (route.name === '퀴즈') iconName = 'help-circle-outline';
          else if (route.name === 'AI 채팅') iconName = 'sparkles-outline';
          else if (route.name === '내정보') iconName = 'person-outline';
          
          return (
            <Ionicons
              name={iconName}
              size={18}
              color={color}
              style={{ marginBottom: 0 }} 
            />
          );
        },
        tabBarLabelStyle: {
          marginBottom: 0,
          fontSize: 12,
        },

        tabBarStyle: {
        height: 58,
        paddingBottom: 4, 
        backgroundColor: colors.white,
        borderTopColor: colors.middleGray,
      },


        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: colors.gray,
        headerShown: false,
      })}
    >
      <Tab.Screen name="홈" component={HomeContent} options={{ title: '홈' }} />
      <Tab.Screen name="소통" component={CommunicationScreen} options={{ title: '소통' }} />
      <Tab.Screen name="퀴즈" component={QuizScreen} options={{ title: '퀴즈' }} />
      <Tab.Screen name="AI 채팅" component={AIchatScreen} options={{ title: 'AI 채팅' }} />
      <Tab.Screen name="내정보" component={ProfileStackNavigator} options={{ title: '프로필' }} />
    </Tab.Navigator>
  );
}