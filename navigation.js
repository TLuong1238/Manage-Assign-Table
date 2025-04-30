import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar } from 'react-native';
import LoginScr from './app/loginScr';
import SignUpScr from './app/signUpScr';
import WelcomeScr from './app/welcomeScr';
import HomeScr from './app/main/homeScr';
import { useAuth } from './context/AuthContext';

const Stack = createNativeStackNavigator();

const forSlideLeft = ({ current, layouts }) => {
  return {
    cardStyle: {
      transform: [
        {
          translateX: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [layouts.screen.width, 0], // Từ phải sang trái
          }),
        },
      ],
    },
  };
};

export default function Navigation() {
  const {user} = useAuth();
  return (
    <>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyleInterpolator: forSlideLeft,
          transitionSpec: {
            open: { animation: 'timing', config: { duration: 250 } },
            close: { animation: 'timing', config: { duration: 250 } },
          },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          lazy: true,
          animationEnabled: true,
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScr} />
            <Stack.Screen name="Login" component={LoginScr} />
            <Stack.Screen name="SignUp" component={SignUpScr} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScr} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}