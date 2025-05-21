import { View, Text } from 'react-native'
import React from 'react'
import { Slot, Tabs } from 'expo-router'
import { theme } from '../../../constants/theme'
import { hp } from '../../../helper/common'
import * as Icon from 'react-native-feather'

export default function TabsLayout() {
    return (
        <Tabs
      screenOptions={{
        headerShown: false,  // Ẩn header
        tabBarActiveTintColor: theme.colors.primaryDark,  // Màu khi tab đang active
        tabBarInactiveTintColor: theme.colors.textLight,  // Màu khi tab không active
        tabBarStyle: {
          height: hp(7),  // Chiều cao của thanh tab
          paddingBottom: hp(1),  // Padding dưới
          paddingTop: hp(1),  // Padding trên
          backgroundColor: 'white',  // Màu nền của thanh tab
          borderTopWidth: 1,  // Viền trên
          borderTopColor: theme.colors.gray,  // Màu viền
        },
      }}
    >
      {/* Tab Trang chủ */}
      <Tabs.Screen
        name="index"  // Tên file index.jsx trong (tabs)
        options={{
          title: 'Trang chủ',  // Tên hiển thị
          tabBarIcon: ({ color }) => (
            <Icon.Home stroke={color} width={hp(2.5)} height={hp(2.5)} />
          ),
        }}
      />

      {/* Tab profile */}
      <Tabs.Screen
        name="profileScr"  // Tên file tableScr.jsx trong (tabs)
        options={{
          title: 'Đặt bàn',
          tabBarIcon: ({ color }) => (
            <Icon.Layers stroke={color} width={hp(2.5)} height={hp(2.5)} />
          ),
        }}
      />

      {/* Tab Thông báo */}
      <Tabs.Screen
        name="notificationScr"  // Tên file notificationScr.jsx trong (tabs)
        options={{
          title: 'Thông báo',
          tabBarIcon: ({ color }) => (
            <Icon.Bell stroke={color} width={hp(2.5)} height={hp(2.5)} />
          ),
        }}
      />

      {/* Tab Hồ sơ */}
      <Tabs.Screen
        name="searchScr"  // Tên file profileScr.jsx trong (tabs)
        options={{
          title: 'Tìm kiếm',
          tabBarIcon: ({ color }) => (
            <Icon.User stroke={color} width={hp(2.5)} height={hp(2.5)} />
          ),
        }}
      />
    </Tabs>
    )
}