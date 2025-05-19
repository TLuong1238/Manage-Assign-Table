import { Alert, FlatList, Pressable, StyleSheet, Text, Touchable, TouchableOpacity, View } from 'react-native'
import React, { useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'expo-router'
import Header from '../../components/MyHeader'
import { hp, wp } from '../../helper/common'
import * as Icon from 'react-native-feather';
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/MyAvatar'
import { theme } from '../../constants/theme'
import { fetchPosts } from '../../services/postServices'
import MyLoading from '../../components/MyLoading'
import MyPostCard from '../../components/MyPostCard'

const ProfileScr = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();
  //
  const [limit, setLimit] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [posts, setPosts] = useState([]);


  // console.log('userData:', user);
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
  // Get user post
  const getPosts = async () => {
    console.log('đã gọi')
    if (!hasMore) return null;
    const newLimit = limit + 10;
    console.log('fetching post: ', newLimit);
    let res = await fetchPosts(newLimit, user.id);
    if (res.success) {
      if (posts.length == res.data.length) {
        console.log('da set false')
        setHasMore(false); // Không còn dữ liệu để load thêm
      }
      setLimit(newLimit);
      setPosts(res.data);
      console.log('da post')

    }
  }

  return (
    <ScreenWrapper bg = {'white'}>
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
          if (hasMore) getPosts();
        }}
        onEndReachedThreshold={0.2}
        ListFooterComponent={hasMore ? (
          <View style={{ marginVertical: posts.length == 0 ? 100 : 30 }}>
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
    </ScreenWrapper>
  )
}

const UserHeader = ({ user, router, handleLogout }) => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: wp(2) }}>
      <View>
        <Header title="Profile " />
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
              size={hp(18)}
              rounded={50}
            />
            <Pressable style={styles.editIcon} onPress={() => router.push('/main/editProfileScr')}>
              <Icon.Edit strokeWidth={2} width={hp(3)} height={hp(3)} color={'black'} />
            </Pressable>
          </View>
          {/* userName */}
          <View style={{ alignItems: 'center', gap: 5 }}>
            <Text style={styles.userName}>{user && user.name} </Text>
            <Text style={styles.userAddress}>{user && user.address} </Text>
            {/* email, phone, bio */}
            <View style={{ width: '100%', borderRadius: 15, borderWidth: 2, paddingHorizontal: 10 }}>
              <View style={styles.info}>
                <Icon.Mail strokeWidth={2} height={hp(8)} width={wp(8)} color={theme.colors.textLight} />
                <Text style={styles.infoText}>{user.email}</Text>
              </View>
            </View>
            <View style={{ width: '100%', borderRadius: 15, borderWidth: 2, paddingHorizontal: 10 }}>
              <View style={styles.info}>
                <Icon.Phone strokeWidth={2} height={hp(8)} width={wp(8)} color={theme.colors.textLight} />
                <Text style={styles.infoText}>{user?.phone || 'Bạn chưa cập nhật số điện thoại'}</Text>
              </View>
            </View>
            <View style={{ width: '100%', borderRadius: 15, borderWidth: 2, paddingHorizontal: 10 }}>
              <View style={styles.info}>
                <Icon.Link strokeWidth={2} height={hp(8)} width={wp(8)} color={theme.colors.textLight} />
                <Text style={styles.infoText}>{user?.bio || 'Bạn chưa cập nhật thông tin liên kết'}</Text>
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
    alignSelf: 'center',
    marginTop: hp(2),
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: -12,
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
    color: theme.colors.text,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start'
  },
  infoText: {
    fontSize: hp(2.5),
    color: theme.colors.textLight,
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