import React from 'react';
import { Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import MyLoading from '../../components/MyLoading';
import { Redirect } from 'expo-router';

export default function MainLayout() {
  const { user, isLoading } = useAuth();
  
  // Bảo vệ route - chỉ cho phép truy cập khi đã đăng nhập
  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <MyLoading />
      </View>
    );
  }
  
  // Chuyển hướng về trang đăng nhập nếu chưa xác thực
  if (!user) {
    return <Redirect href="/welcomeScr" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      {/* Tab Navigator */}
      <Stack.Screen 
        name="(tabs)" 
        options={{
          headerShown: false,
        }}
      />
      
      {/* Các màn hình modal */}
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
  );
}