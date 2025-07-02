import { View, Text } from 'react-native'
import React from 'react'
import { Slot, Tabs } from 'expo-router'
import { theme } from '../../../constants/theme'
import { hp } from '../../../helper/common'
import Feather from '@expo/vector-icons/Feather';
import AntDesign from '@expo/vector-icons/AntDesign';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarShowLabel: false,  
        tabBarActiveTintColor: '#FFBF00',
        tabBarInactiveTintColor: theme.colors.textLight,
        

        tabBarStyle: {
          height: hp(5),
          backgroundColor: 'white',
          justifyContent: 'center',
        },
      }}
    >
      {/* Home */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />
      {/* manage Social */}
      <Tabs.Screen
        name="managePostScr"
        options={{
          title: 'Mạng xã hội',
          tabBarIcon: ({ color }) => (
            <AntDesign name="cloudo" size={24} color={color} />
          ),
        }}
      />

      {/* report */}
      <Tabs.Screen
        name="reportScr"
        options={{
          title: 'Báo cáo',
          tabBarIcon: ({ color }) => (
            <Ionicons name="notifications-outline" size={24} color={color} />
          ),
        }}
      />
      {/* manage Table */}
      <Tabs.Screen
        name="manageTableScr"
        options={{
          title: 'quản lý đặt bàn',
          tabBarIcon: ({ color }) => (
            <MaterialIcons name="history" size={24} color={color} />
          ),
        }}
      />
      {/* profile */}
      <Tabs.Screen
        name="profileScr"
        options={{
          title: 'Thông tin',
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}