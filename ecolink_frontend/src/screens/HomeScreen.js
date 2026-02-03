import { StyleSheet, Text, View } from 'react-native'
import React,{useContext} from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import colors from '../colors';
import CommunicationScreen from './CommunicationScreen';
import Profile from './Profile';
import AIchatScreen from './AIchatScreen';
import MainTabNavigator from '../navigation/MainTabNavigator';
import HomeContent from '../components/HomeComponent';
import { ThemeContext } from '../contexts/ThemeContext'; // 테마 컨텍스트 import



export default function HomeScreen() {
  const { theme } = useContext(ThemeContext);

  return(
    <>
      <MainTabNavigator />
    </>

    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
