import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import MyButton from '../../components/MyButton'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import * as Icon from 'react-native-feather';
import { useRouter } from 'expo-router'
import Avatar from '../../components/Avatar'

const HomeScr = () => {
  const {user, setAuth } = useAuth();
  const router =useRouter();

  //log user
  console.log('userInfor:', user);

  // const onLogout = async () => {
  //   setAuth(null);
  //   const { error } = await supabase.auth.signOut();

  //   if (error) {
  //     console.log('error', error);
  //   } else {
  //     console.log('Đăng xuất thành công!');
  //   }
  // }


  return (
    <ScreenWrapper bg = 'white'>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bún chả Obama</Text>
          <View style={styles.icons}>
            <Pressable onPress={()=> router.push('/main/notificationScr')}>
              <Icon.Heart strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
            </Pressable>
            <Pressable onPress = {() => router.push('/main/newPostScr')}>
              <Icon.PlusSquare strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
            </Pressable>
            <Pressable onPress ={()=> router.push('/main/profileScr')}>
              <Avatar 
                uri={user?.image}
              />
            </Pressable>

          </View>


        </View>
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
  }

})