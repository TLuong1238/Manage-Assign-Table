import React, { useEffect } from 'react'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Stack, useRouter } from 'expo-router'
import { getUserData } from '../services/userService'
import { LogBox, View } from 'react-native'
import MyLoading from '../components/MyLoading'
// Bỏ qua một số warnings không cần thiết
LogBox.ignoreLogs([
  'Warning: TNodeChildrenRenderer',
  'Warning: MemoizedTNodeRenderer',
  'Warning: TRenderEngineProvider'
]);

const RootLayout = () => {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  )
}

const MainLayout = () => {
  const { user, setAuth, setUserData, setLoading, isLoading } = useAuth();
  const router = useRouter();

  // Kiểm tra session hiện tại khi ứng dụng khởi động
  useEffect(() => {
    const checkSession = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        console.log("Initial session check:", data?.session ? "Session found" : "No session");
        
        if (data?.session) {
          setAuth(data.session.user);
          await updateUserData(data.session.user, data.session.user?.email);
          router.replace('/main/(tabs)');
        } else {
          setAuth(null);
          router.replace('/welcomeScr');
        }
      } catch (error) {
        console.error("Error checking session:", error);
        router.replace('/welcomeScr');
      } finally {
        setLoading(false);
      }
    };
    
    checkSession();
    
    // Theo dõi thay đổi trong trạng thái xác thực
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("Auth state changed:", _event);
      
      if (session) {
        setAuth(session?.user);
        updateUserData(session?.user, session?.user?.email);
        router.replace('/main/(tabs)');
      } else {
        setAuth(null);
        router.replace('/welcomeScr');
      }
    });
    
    return () => {
      data?.subscription?.unsubscribe();
    };
  }, []);

  const updateUserData = async (user, email) => {
    if (!user?.id) return;
    let res = await getUserData(user?.id);
    if (res.success) {
      setUserData({ ...res.data, email });
    }
  }

  // Hiển thị loading khi đang kiểm tra xác thực
  if (isLoading) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <MyLoading />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="main" />
      <Stack.Screen name="welcomeScr" />
    </Stack>
  )
}

export default RootLayout