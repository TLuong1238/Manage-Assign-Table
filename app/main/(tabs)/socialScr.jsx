import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import * as Icon from 'react-native-feather';
import { useRouter } from 'expo-router'
import MyAvatar from '../../../components/MyAvatar'
import { fetchPosts } from '../../../services/postServices'
import MyLoading from '../../../components/MyLoading'
import { getUserData } from '../../../services/userService'
import MyPostCard from '../../../components/MyPostCard'
import usePostRt from '../../../hook/usePostRt'
const HomeScr = () => {

  const { user } = useAuth();
  const router = useRouter();

  // console.log('User in HomeScr:', user);
  const {
    posts,
    loading,
    hasMore,
    getPosts,
    notificationCount,
    setNotificationCount,
  } = usePostRt(user, 10);




  return (
    <ScreenWrapper bg='#FFBF00'>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bún chả Obama</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => {
              setNotificationCount(0);
              router.push('/main/notificationScr'
              )
            }}>
              <Icon.Heart strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
              {
                notificationCount > 0 && (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {notificationCount}
                    </Text>
                  </View>
                )
              }


            </Pressable>
            <Pressable onPress={() => {
              setNotificationCount(0);
              router.push('/main/newPostScr')
            }}>
              <Icon.PlusSquare strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
            </Pressable>
            <Pressable onPress={() => router.push('/main/profileScr')}>
              <MyAvatar
                uri={user?.image}
              />
            </Pressable>
          </View>
        </View>
        {/* post */}

        <FlatList
          data={posts}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listStyle}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <MyPostCard
            item={item}
            currentUser={user}
            router={router}
          />
          }
          onEndReached={() => {
            if (hasMore && !loading) getPosts();
          }}
          onEndReachedThreshold={0.2}
          ListFooterComponent={hasMore && loading ? (
            <View style={{ marginVertical: posts.length == 0 ? 200 : 30 }}>
              <MyLoading />
            </View>
          ) : (
            <View style={{ marginVertical: 20 }}>
              <Text style={styles.noPosts}>
                Bạn đã xem hết nội dung...
              </Text>
            </View>
          )

          }

        />
      </View>
      {/* <Button title='Đăng xuât' onPress={onLogout} /> */}
    </ScreenWrapper>
  )
}

export default HomeScr

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: wp(4)
  },
  title: {
    fontSize: hp(3.5),
    fontWeight: 'bold',
    color: theme.colors.text
  },
  icons: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listStyle: {
    paddingTop: 20,
    paddingHorizontal: wp(4)
  },
  noPosts: {
    fontSize: hp(2.5),
    textAlign: 'center',
    color: theme.colors.text
  },
  pill: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: theme.colors.roseLight,
    width: hp(2),
    height: hp(2),
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: hp(1.5),
    color: 'white',
    fontWeight: theme.fonts.bold
  }

})