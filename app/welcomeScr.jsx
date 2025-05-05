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
  const navigation = useNavigation();
  const router = useRouter();
  return (
    <ScreenWrapper bg='wwhite'>
      <StatusBar style="dark" />
      <View style={styles.container}>
        <Image style={styles.welcomeImage} source={require('../assets/images/welcome.png')} />
        {/* title */}
        <View style={{ paddingBottom: hp(5) }}>
          <Text style={styles.title}>LinkUp!</Text>
          <Text style={styles.subTitle}>Connect with your friends and family</Text>
        </View>
        {/* Footer */}
        <View style={styles.footer}>
          <MyButton
            title="Get Started"
            buttonSyle={{ marginHorizontal: wp(3) }}
            // onPress={() => navigation.navigate('SignUp')}
            onPress={() => router.push('/signUpScr')}
          />
          <View style={styles.bottomContainer}>
            <Text style={styles.LoginText}>Already have an account?</Text>
            {/* <Pressable onPress={() => navigation.navigate('Login')}> */}
            <Pressable onPress={() => router.push('/loginScr')}>
              <Text style={[styles.LoginText, { color: theme.colors.primaryDark, fontWeight: 'semibold' }]}>
                Login
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
    backgroundColor: 'white',
    paddingHorizontal: wp(4),
  },
  welcomeImage: {
    width: wp(100),
    height: hp(30),
    resizeMode: 'contain',
    alignSelf: 'center',
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