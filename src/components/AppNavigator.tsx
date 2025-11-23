import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, StyleSheet } from 'react-native';

import DashboardScreen from '../screens/DashboardScreen';
import MovieDetailsScreen from '../screens/MovieDetailsScreen';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import DashboardBaseline from '../screens/DashboardBaseline';
import DashboardFastImage from '../screens/DashboardFastImage';
import DashboardBaselineDois from '../screens/DashboardBaselineDois';
import DashboardFastImageDois from '../screens/DashboardFastImageDois';
import MovieDetailsBaseline from '../screens/MovieDetailsBaseline';

type RootStackParamList = {
  Dashboard: undefined;
  MovieDetails: { movieId: number };
};

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Pilha das telas autenticadas
function DashboardStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen
        name="MovieDetails"
        component={MovieDetailsScreen}
        options={{ title: 'Detalhes do Filme' }}
      />
    </Stack.Navigator>
  );
}

// Menu
function CustomDrawerContent(props: any) {
  const logout = async () => {
    await AsyncStorage.removeItem('token');
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={s.header}>
        <Text style={s.headerText}>Cinema Móvel</Text>
      </View>
      <DrawerItem
        label="Dashboard"
        onPress={() =>
          props.navigation.navigate('DashboardStack', { screen: 'Dashboard' })
        }
      />
      <DrawerItem label="Sair" onPress={logout} />
    </DrawerContentScrollView>
  );
}

// Header
export default function AppNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="DashboardStack"
      drawerContent={props => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="DashboardStack"
        component={DashboardStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Dashboard';

          let title = 'Dashboard';
          if (routeName === 'MovieDetails') title = 'Detalhes do Filme';

          return { title };
        }}
      />
    </Drawer.Navigator>
  );
}

const s = StyleSheet.create({
  header: {
    padding: 16,
    backgroundColor: '#f4f4f4',
    borderBottomWidth: 1,
    borderColor: '#ddd',
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
