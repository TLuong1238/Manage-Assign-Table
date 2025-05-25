import { ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { fetchNotification } from '../../../services/notificationServices';
import { useAuth } from '../../../context/AuthContext';
import { hp, wp } from '../../../helper/common';
import { theme } from '../../../constants/theme';
import ScreenWrapper from '../../../components/ScreenWrapper';
import { useRouter } from 'expo-router';
import MyNotifiItem from '../../../components/MyNotifiItem';
import MyHeader from '../../../components/MyHeader';
import useNotiRt from '../../../hook/useNotiRt';
const NotificationScr = () => {

  const { user } = useAuth();
  const router = useRouter();

  const {
    noti,
    loading,
    hasMore,
    getNotis,

  } = useNotiRt(user, 10);



  return (
    <ScreenWrapper bg={'#FFBF00'}>
      <View style={styles.container}>
        <MyHeader
          title={'Thông báo'}
          showBackButton={false}
        />
        <ScrollView
          showVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}>
          {
            noti.map(item => {

              return (
                <MyNotifiItem
                  key={item?.id}
                  item={item}
                  router={router}
                />

              )
            })
          }
          {
            noti.length == 0 && (
              <Text style={styles.noData}>
                Không có thông báo nào
              </Text>
            )
          }

        </ScrollView>

      </View>

    </ScreenWrapper>
  )
}

export default NotificationScr

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(5),
  },
  listStyle: {
    paddingVertical: 10,
    gap: 10,
  },
  noData: {
    fontSize: hp(2),
    fontWeight: 'semibold',
    textAlign: 'center',
    color: theme.colors.text
  }
})