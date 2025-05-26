import { View, Text, Image, StatusBar, Pressable } from 'react-native'
import React from 'react'
import ScreenWrapper from '../components/ScreenWrapper'
import { StyleSheet } from 'react-native'
import { hp, wp } from '../helper/common'
import { theme } from '../constants/theme'
import MyButton from '../components/MyButton'
import { useNavigation, useRouter } from 'expo-router'
//

const WelcomeScr = () => {
  const router = useRouter();
  return (
    <ScreenWrapper bg='#FFBF00'>
      <View style={styles.container}>
        <Image style={styles.welcomeImage} source={require('../assets/images/logo.jpg')} />
        {/* title */}
        <View style={{ paddingBottom: hp(5) }}>
          <Text style={styles.title}>Xin chào!</Text>
          <Text style={styles.subTitle}>Hãy bắt đầu trải nghiệm của bạn!</Text>
        </View>
        {/* Footer */}
        <View style={styles.footer}>
          <MyButton
            title="Bắt đầu"
            buttonSyle={{ marginHorizontal: wp(3) }}
            onPress={() => router.push('/signUpScr')}
          />
          <View style={styles.bottomContainer}>
            <Text style={styles.LoginText}>Bạn đã có tài khoản?</Text>
            <Pressable onPress={() => router.push('/loginScr')}>
              <Text style={[styles.LoginText, { color: theme.colors.primaryDark, fontWeight: 'semibold' }]}>
                Đăng nhập
              </Text>
            </Pressable>

          </View>
        </View>
      </View>
    </ScreenWrapper>
  )
}

export default WelcomeScr

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: wp(4),
  },
  welcomeImage: {
    width: wp(100),
    height: hp(30),
    resizeMode: 'contain',
    alignSelf: 'center',
    borderRadius: 20,
  },
  title: {
    fontSize: hp(5),
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: hp(2.5),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
  footer: {
    gap: 10,
    width: '100%',
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },
  LoginText: {
    fontSize: hp(2.5),
    color: theme.colors.textLight,
    textAlign: 'center',
  },
})