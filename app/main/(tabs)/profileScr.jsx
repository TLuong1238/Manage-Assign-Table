import { Alert, FlatList, Pressable, StyleSheet, Text, Touchable, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useRef, useState } from 'react'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { useAuth } from '../../../context/AuthContext'
import { useRouter } from 'expo-router'
import { hp, wp } from '../../../helper/common'
import * as Icon from 'react-native-feather';
import { supabase } from '../../../lib/supabase'
import Avatar from '../../../components/MyAvatar'
import { theme } from '../../../constants/theme'
import { fetchPosts } from '../../../services/postServices'
import MyLoading from '../../../components/MyLoading'
import MyPostCard from '../../../components/MyPostCard'
import { usePostRt } from '../../../hook/usePostRt'
import MyHeader from '../../../components/MyHeader'

const ProfileScr = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();
  //
  const {
    posts,
    loading,
    hasMore,
    getPosts,
  } = usePostRt(user, 10, true);

  const onLogout = async () => {
    setAuth(null);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.log('error', error);
    } else {
      console.log('Đăng xuất thành công!');
    }
  }

  const handleLogout = async () => {
    Alert.alert("Xác nhân", "Bạn có chắc chắn muốn đăng xuất không?", [
      {
        text: "Hủy bỏ", onPress: () => console.log("Hủy"),
        style: 'cancel'
      },
      {
        text: "Đồng ý", onPress: () => onLogout(),
        style: 'destructive'
      }
    ])
  }



  return (
    <ScreenWrapper bg={'#FFBF00'}>
      {/* user post */}
      <FlatList
        ListHeaderComponent={<UserHeader user={user} router={router} handleLogout={handleLogout} />}
        ListHeaderComponentStyle={{ marginBottom: 20 }}
        //
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
          <View style={{ marginVertical: posts.length == 0 ? 100 : 30 }}>
            <MyLoading />
          </View>
        )
          : null

        }

      />
    </ScreenWrapper>
  )
}

const UserHeader = ({ user, router, handleLogout }) => {
  return (
    <View style={{ flex: 1, backgroundColor: '#FFBF00', paddingHorizontal: wp(2) }}>
      <View>
        <MyHeader title="Profile" showBackButton={false} />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon.Power strokeWidth={2} width={wp(5)} height={wp(5)} color={'red'} />
        </TouchableOpacity>
      </View>
      {/* profile info */}
      <View style={styles.container}>
        <View style={{ gap: 15 }}>
          {/* avatar */}
          <View style={styles.avatarContainer}>
            <Avatar
              uri={user?.image}
              size={hp(20)}
              rounded={50}
            />
            <Pressable style={styles.editIcon} onPress={() => router.push('/main/editProfileScr')}>
              <Icon.Edit strokeWidth={2} width={hp(3)} height={hp(3)} color={'black'} />
            </Pressable>

            {/* userName */}
            <View style={{ alignItems: 'flex-start',gap: 5, paddingLeft: 10 }}>
              <Text style={styles.userName}>{user && user.name} </Text>
              <Text style={{color: 'white'}}>{user && user.bio} </Text>
              {/* email, phone, bio */}
              {/* email, phone, bio */}
              <View style={styles.info}>
                <Icon.Mail strokeWidth={2} height={hp(2.5)} width={wp(5)} color={'white'} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
              <View style={styles.info}>
                <Icon.Phone strokeWidth={2} height={hp(2.5)} width={wp(5)} color={'white'} />
                <Text style={styles.infoText}>{user?.phone || 'Bạn chưa cập nhật số điện thoại'}</Text>
              </View>
              <View style={styles.info}>
                <Icon.Home strokeWidth={2} height={hp(2.5)} width={wp(5)} color={'white'} />
                <Text style={styles.infoText}>{user?.address || 'Bạn chưa cập nhật thông tin liên kết'}</Text>
              </View>

            </View>
          </View>
        </View>
      </View>
    </View>

  )


}

export default ProfileScr

const styles = StyleSheet.create({
  logoutButton: {
    position: 'absolute',
    right: 0,
    marginTop: 10,
    padding: 5,
    borderRadius: 10,
    backgroundColor: "#fee2e2"
  },
  container: {
    flex: 1,
  },
  avatarContainer: {
    marginTop: hp(2),
    flexDirection: 'row',
    alignItems: 'center',
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    left: 130,
    backgroundColor: 'white',
    padding: 7,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: 'white',
    shadowColor: theme.colors.textLight,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 7,
  },
  userName: {
    fontSize: hp(4),
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'flex-start',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start'
  },
  infoText: {
    fontSize: hp(2),
    color: 'white',
    fontWeight: '500',
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

})