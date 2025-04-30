import { Alert, Pressable, StyleSheet, Text, Touchable, TouchableOpacity, View } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { useAuth } from '../../context/AuthContext'
import { useRouter } from 'expo-router'
import Header from '../../components/Header'
import { hp, wp } from '../../helper/common'
import * as Icon from 'react-native-feather';
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/Avatar'
import { theme } from '../../constants/theme'

const ProfileScr = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();

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
    <ScreenWrapper>
      <UserHeader user={user} router={router} handleLogout={handleLogout} />
    </ScreenWrapper>
  )
}

const UserHeader = ({ user, router, handleLogout }) => {
  return (
    <View style={{ flex: 1, backgroundColor: 'white', paddingHorizontal: wp(2) }}>
      <View>
        <Header title="Profile "/>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon.Power strokeWidth={2} width={wp(5)} height={wp(5)} color={'red'} />
        </TouchableOpacity>
      </View>
      {/* profile ìno */}
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

})