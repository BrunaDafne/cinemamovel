import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DashboardScreen from '../screens/DashboardScreen';
import { View, Text, StyleSheet } from 'react-native';

type Props = {
  navigation: any;
};

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: Props) {
  const logout = async () => {
    await AsyncStorage.removeItem('token'); // limpa o token salvo
    props.navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }], // volta para login
    });
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={s.header}>
        <Text style={s.headerText}>Cinema Móvel</Text>
      </View>
      <DrawerItem
        label="Dashboard"
        onPress={() => props.navigation.navigate('Dashboard')}
      />
      <DrawerItem
        label="Sair"
        onPress={logout}
      />
    </DrawerContentScrollView>
  );
}

export default function AppNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Dashboard"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
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
