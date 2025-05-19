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
import MyPostCard from '../../components/MyPostCard'

const HomeScr = () => {
  const { user, setAuth } = useAuth();
  const router = useRouter();

  const [limit, setLimit] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [posts, setPosts] = useState([]);

  const getPosts = async () => {
    console.log('đã gọi')
    if (!hasMore) return null;
    const newLimit = limit + 10;
    console.log('fetching post: ', newLimit);
    let res = await fetchPosts(newLimit);
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

  const handlePostEvent = async (payload) => {
    console.log('Received post event:', payload.eventType, payload);
    if (payload.eventType == 'INSERT' && payload?.new?.id) {
      let newPost = { ...payload.new };
      let res = await getUserData(newPost.userId);
      newPost.postLikes = [];
      newPost.comments = [{count: 0}]
      newPost.user = res.success ? res.data : {};
      console.log('newPost:', newPost);
      setPosts(prevPosts => [newPost, ...prevPosts]);
    }

    if( payload.eventType == 'DELETE' && payload?.old?.id) {
      setPosts(prevPosts => {
        let updatedPosts = prevPosts.filter(post => post.id != payload.old.id);
        return updatedPosts; 
      })
    }


    if( payload.eventType == 'UPDATE' && payload?.new?.id) {
      console.log('update post:', payload);
      setPosts(prevPosts => {
        let updatedPosts = prevPosts.map(post => {
          if(post.id == payload.new.id) {
            post.body = payload.new.body;
            post.file = payload.new.file;
            post.created_at = payload.new.created_at;
          }
          return post;
        });

        return updatedPosts; 
      })
    }
  };

  useEffect(() => {
    let postsChannel = supabase
      .channel('posts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' }, 
        handlePostEvent)
      .subscribe();

    
    getPosts();
    console.log("đã đến đây")

    return () => {
      supabase.removeChannel(postsChannel);
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
          ListFooterComponent={hasMore ?(
            <View style={{ marginVertical: posts.length == 0 ? 200 : 30 }}>
              <MyLoading />
            </View>
          ) : (
            <View style = {{marginVertical: 20}}>
              <Text style = {styles.noPosts}>
                Bạn đã xem hết nội dung...
              </Text>
            </View>
          )

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
    fontSize: hp(2.5),
    textAlign: 'center',
    color: theme.colors.text
  },
  pill: {

  },

})