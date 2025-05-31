import { Alert, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import React, { useRef, useState } from 'react'
import * as Icon from 'react-native-feather'
import { theme } from '../constants/theme'
import ScreenWrapper from '../components/ScreenWrapper'
import MyBackButton from '../components/MyBackButton'
import { hp, wp } from '../helper/common'
import MyInput from '../components/MyInput'
import MyButton from '../components/MyButton'
import { useNavigation } from '@react-navigation/native'
import { supabase } from '../lib/supabase'
import { useRouter } from 'expo-router'

const LoginScr = () => {
  const router = useRouter();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!emailRef.current || !passwordRef.current) {
      Alert.alert('Thông báo', 'Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    let email = emailRef.current.trim();
    let password = passwordRef.current.trim();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (data.user) {
      const roleCheck = await checkAdminRole(data.user.id);

      setLoading(false);
      console.log('Đăng nhập thành công:', roleCheck.data);
      if (!roleCheck.success) {
        Alert.alert('Thông báo', 'Có lỗi xảy ra khi kiểm tra thông tin tài khoản!');
        await supabase.auth.signOut();
        return;
      }

      if (!roleCheck.isAdmin) {
        Alert.alert('Thông báo', 'Tài khoản của bạn không có quyền đăng nhập!');
        await supabase.auth.signOut();
        return;
      }

      // Đăng nhập thành công với quyền admin
      console.log('Đăng nhập thành công với quyền admin');
    }
  }

  return (
    <ScreenWrapper bg='#FFBF00'>
      <View style={styles.container}>
        <MyBackButton />
        {/* welcomm */}
        <View>
          <Text style={styles.welcomText} >Chào mừng,</Text>
          <Text style={styles.welcomText} >Bạn đã quay trở lại!</Text>
        </View>
        {/* form */}
        <View style={{ gap: 20 }}>
          <Text style={{ fontSize: hp(2.5), fontWeight: '500', color: 'white' }}>
            Vui lòng đăng nhập để tiếp tục!
          </Text>

          <MyInput
            icon={<Icon.Mail stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />}
            placeholder='Nhập email của bạn...'
            onChangeText={value => emailRef.current = value}
          />
          <MyInput
            icon={<Icon.Lock stroke={theme.colors.dark} strokeWidth={2} width={26} height={26} />}
            placeholder='Nhập mật khẩu của bạn...'
            secureTextEntry
            onChangeText={value => passwordRef.current = value}
          />
          <Text style={styles.forgotPasswordText}>
            Quên mật khẩu?
          </Text>
          <MyButton title='Đăng nhập' loading={loading} onPress={onSubmit}
            buttonStyle={{ width: wp(70), alignItems: 'center', alignSelf: 'center' }}
          />
          {/* footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Bạn chưa có tài khoản?</Text>
            <Pressable onPress={() => router.push('/signUpScr')}>
              <Text style={{ color: theme.colors.primary, fontSize: hp(2.5), fontWeight: '500' }}>
                Đăng ký
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default LoginScr

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 45,
    paddingHorizontal: wp(2),
    paddingTop: wp(2),
  },
  welcomText: {
    fontSize: hp(4),
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: wp(2),
  },
  forgotPasswordText: {
    textAlign: 'right',
    fontSize: hp(2.5),
    fontWeight: '500',
    color: theme.colors.text,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
})