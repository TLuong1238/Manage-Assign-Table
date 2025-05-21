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

const NotificationScr = () => {

  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const router = useRouter();



  useEffect(() => {
    getNotifications();
  }, [])

  const getNotifications = async () => {
    let res = await fetchNotification(user.id);
    console.log('resNotifi:', res);
    if(res.success) {
      setNotifications(res.data);
    }
  }


  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <MyHeader title={'Thông báo'} />
        <ScrollView
          showVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}>
          {
            notifications.map(item => {
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
            notifications.length == 0 && (
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