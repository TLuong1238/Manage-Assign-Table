import React, { useEffect, useContext } from 'react'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useNavigation } from '@react-navigation/native'
import Navigation from '../navigation'
import { Stack, useRouter } from 'expo-router'
import { getUserData } from '../services/userService'


const _layout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  )
}

const MainLayout = () => {
  const { user,setAuth, setUserData } = useAuth();
  const navigation = useNavigation();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.onAuthStateChange((_event, session) => {
      // console.log('user:', session?.user.app_metadata);
      // console.log('session user:', session?.user?.id);

      if (session) {
        setAuth(session?.user);
        updateUserData(session?.user, session?.user?.email);
        // navigation.replace('Home');
        router.replace('main/homeScr');
      } else {
        setAuth(null);
        // navigation.replace('Welcome');
        router.replace('welcomeScr');
      }
      // supabase.auth.onAuthStateChange((_event, session) => {
      //   setAuth(session?.user || null); 
      // })

    })
  }, [])

  const updateUserData = async (user, email) => {
    let res = await getUserData(user?.id);
    if (res.success) {
      setUserData({...res.data,email});
    }
    
  }

  // return <Navigation />
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }
      }
    />
  )
}

export default _layout