import React from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from './src/screens/HomeScreen';
import LoginScreen from './src/screens/LoginScreen';
import CommunicationScreen from './src/screens/CommunicationScreen';
import QuizAnalysis from './src/screens/QuizAnalysis';
import QuizScreen from './src/screens/QuizScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SignWordListScreen from './src/components/SignWordListScreen';
import { ThemeProvider } from './src/contexts/ThemeContext'; 

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Login">
          <Stack.Screen name="Login" component={LoginScreen} options={{headerShown: false}} />
          <Stack.Screen name="Home" component={HomeScreen} options={{headerShown:false}} />
          <Stack.Screen name="QuizScreen" component={QuizScreen} options={{headerShown: false}} />
          <Stack.Screen name="SignWordList" component={SignWordListScreen} options={{ title: '검색 결과' }}/>
          <Stack.Screen name="QuizAnalysis" component={QuizAnalysis} options={{headerShown: false}} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});