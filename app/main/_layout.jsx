import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import MyLoading from '../../components/MyLoading';
import { Redirect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function MainLayout() {
  const { user, isLoading } = useAuth();

  // 
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <MyLoading />
      </View>
    );
  }

  // not user
  if (!user) {
    return <Redirect href="/welcomeScr" />;
  }

  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFBF00" />
      {/* Stack Navigator */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          tabBarActiveTintColor: '#FFBF00',
        }}
      >
        {/* Tab Navigator */}
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />

        {/* Scree */}
        <Stack.Screen
          name="postDetailsScr"
        />

        <Stack.Screen
          name="newPostScr"
        />

        <Stack.Screen
          name="editProfileScr"
        />

      </Stack>
    </>
  );
}