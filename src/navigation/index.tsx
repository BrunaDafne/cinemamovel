import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from '../screens/LoginScreen';
import AppNavigator from '../components/AppNavigator';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';

export type RootStackParamList = {
  Login: undefined;
  App: undefined;
  Dashboard: undefined;
  MovieDetails: {
    movieId: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function Navigation() {
  const [initialRoute, setInitialRoute] = useState<'Login' | 'App'>('Login');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = await AsyncStorage.getItem('token');
      setInitialRoute(token ? 'App' : 'Login');
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) return null; 

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="App" component={AppNavigator} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
