import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import MyButton from '../../components/MyButton'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import * as Icon from 'react-native-feather';
import { useRouter } from 'expo-router'
import MyAvatar from '../../components/MyAvatar'
import { fetchPosts } from '../../services/postServices'
import PostCard from '../../components/MyPostCard'
import MyLoading from '../../components/MyLoading'
import { getUserData } from '../../services/userService'

const HomeScr = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();
  const [limit, setLimit] = useState(10);

  const [posts, setPosts] = useState([]);

  const getPosts = async () => {
    const newLimit = limit + 10;
    setLimit(newLimit);
    let res = await fetchPosts(limit);
    if (res.success) {
      // console.log('fetch data:', res.data);
      setPosts(res.data);
    }
  }

  const handlePostEvent = async (payload) => {
    if (payload.eventType == 'INSERT' && payload?.new?.id) {
      console.log('Realtime payload:', payload);
      let newPost = { ...payload.new };
      let res = await getUserData(newPost.userId);
      newPost.user = res.success ? res.data : {};
      console.log('newPost:', newPost);
      setPosts(prevPosts => [newPost, ...prevPosts]);
    }
  };

  useEffect(() => {
    let postChannel = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, handlePostEvent)
      .subscribe();


    getPosts();


    return () =>{
      supabase.removeChannel(postChannel);
    }
  }, [])


  //log user
  // console.log('userInfor:', user);

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
    <ScreenWrapper bg='white'>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bún chả Obama</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => router.push('/main/notificationScr')}>
              <Icon.Heart strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
            </Pressable>
            <Pressable onPress={() => router.push('/main/newPostScr')}>
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
          renderItem={({ item }) => <PostCard
            item={item}
            currentUser={user}
            router={router}
          />
          }
          ListFooterComponent={
            <View style={{ marginVertical: posts.length == 0 ? 200 : 30 }}>
              <MyLoading />
            </View>
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
    fontSize: hp(12),
    textAlign: 'center',
    color: theme.colors.text
  },
  pill: {

  }

})