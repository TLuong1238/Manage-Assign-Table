import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
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

  const { user } = useAuth();
  const router = useRouter();
  const [limit, setLimit] = useState(10);
  const [hasMore, setHasMore] = useState(true);
  const [posts, setPosts] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const postsMapRef = useRef(new Map());

  // Tối ưu hóa fetch posts với debounce
  const getPosts = useCallback(async (isInitialFetch = false) => {
    if (!hasMore && !isInitialFetch) return;

    try {
      const newLimit = isInitialFetch ? limit : limit + 10;
      console.log('Fetching posts:', newLimit);

      const res = await fetchPosts(newLimit);

      if (res.success) {
        // Chuyển đổi dữ liệu thành Map để xử lý hiệu quả hơn
        const newPostsMap = new Map();
        res.data.forEach(post => {
          newPostsMap.set(post.id, post);
        });
        postsMapRef.current = newPostsMap;

        setPosts(res.data);
        setLimit(newLimit);
        setHasMore(posts.length !== res.data.length);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  }, [limit, hasMore, posts.length]);

  // Xử lý sự kiện realtime với memoization
  const handlePostEvent = useCallback(async (payload) => {
    const { eventType, new: newData, old: oldData } = payload;
    console.log(`Received ${eventType} event:`, payload);

    try {
      switch (eventType) {
        case 'INSERT':
          if (newData?.id) {
            // Lấy thông tin user và tạo cấu trúc post đầy đủ
            const res = await getUserData(newData.userId);
            const newPost = {
              ...newData,
              likes: [],
              comments: [{ count: 0 }],
              user: res.success ? res.data : {}
            };

            // Thêm vào Map và cập nhật state
            postsMapRef.current.set(newPost.id, newPost);
            setPosts([newPost, ...posts.filter(p => p.id !== newPost.id)]);
          }
          break;

        case 'UPDATE':
          if (newData?.id && postsMapRef.current.has(newData.id)) {
            // Lấy post hiện tại và cập nhật thông tin
            const currentPost = postsMapRef.current.get(newData.id);
            const updatedPost = {
              ...currentPost,
              body: newData.body,
              file: newData.file,
              updated_at: newData.updated_at,
              created_at: newData.created_at
            };

            // Cập nhật Map và state
            postsMapRef.current.set(updatedPost.id, updatedPost);
            setPosts(prevPosts =>
              prevPosts.map(post => post.id === updatedPost.id ? updatedPost : post)
            );
          }
          break;

        case 'DELETE':
          if (oldData?.id && postsMapRef.current.has(oldData.id)) {
            // Xóa khỏi Map và cập nhật state
            postsMapRef.current.delete(oldData.id);
            setPosts(prevPosts => prevPosts.filter(post => post.id !== oldData.id));
          }
          break;
      }
    } catch (error) {
      console.error(`Error handling ${eventType} event:`, error);
    }
  }, []);

  // Thiết lập kênh comments riêng biệt
  const handleCommentEvent = useCallback(async (payload) => {
    if (payload?.eventType === 'INSERT' && payload?.new?.postId) {
      const postId = payload.new.postId;

      if (postsMapRef.current.has(postId)) {
        const post = postsMapRef.current.get(postId);

        // Tạo bản sao và cập nhật số lượng comments
        const updatedPost = { ...post };
        if (updatedPost.comments?.[0]?.count !== undefined) {
          updatedPost.comments = [{ count: updatedPost.comments[0].count + 1 }];
        } else {
          updatedPost.comments = [{ count: 1 }];
        }

        // Cập nhật Map và state
        postsMapRef.current.set(postId, updatedPost);
        setPosts(prevPosts =>
          prevPosts.map(p => p.id === postId ? updatedPost : p)
        );
      }
    } else if (payload?.eventType === 'DELETE' && payload?.old?.postId) {
      // Xử lý khi xóa comment
      const postId = payload.old.postId;

      if (postsMapRef.current.has(postId)) {
        const post = postsMapRef.current.get(postId);

        // Tạo bản sao và giảm số lượng comments
        const updatedPost = { ...post };
        if (updatedPost.comments?.[0]?.count !== undefined && updatedPost.comments[0].count > 0) {
          updatedPost.comments = [{ count: updatedPost.comments[0].count - 1 }];
        }

        // Cập nhật Map và state
        postsMapRef.current.set(postId, updatedPost);
        setPosts(prevPosts =>
          prevPosts.map(p => p.id === postId ? updatedPost : p)
        );

        console.log(`[COMMENTS] Decreased comment count for post ${postId}:`,
          updatedPost.comments?.[0]?.count);
      }
    }

  }, []);

  // Xử lý thông báo mới
  const handleNewNotification = useCallback(async (payload) => {
    console.log(`[NOTIFICATION] Received new notification:`, payload);
    // Xử lý thông báo mới ở đây
    if (payload.eventType === 'INSERT' && payload.new) {
      setNotificationCount(prev => prev + 1);
    }
    // Có thể gọi hàm để cập nhật danh sách thông báo trong state
    // Hoặc hiển thị thông báo cho người dùng
  }, []);

  // Xử lý sự kiện like
  const handleLikeEvent = useCallback(async (payload) => {
    console.log(`[LIKES] Received ${payload.eventType} event:`, payload);
    // const { eventType, new: newData, old: oldData } = payload;

    // if (payload.eventType === 'INSERT' && payload?.new?.postId) {
    //   // Xử lý thêm like (code hiện tại của bạn)
    //   const postId = payload.new.postId;

    //   if (postsMapRef.current.has(postId)) {
    //     const post = postsMapRef.current.get(postId);
    //     const updatedPost = { ...post };
    //     updatedPost.postLikes = [...(updatedPost.postLikes || []), payload.new];

    //     postsMapRef.current.set(postId, updatedPost);
    //     setPosts(prevPosts =>
    //       prevPosts.map(p => p.id === postId ? updatedPost : p)
    //     );
    //   }
    // }
    // else if (payload.eventType === 'DELETE' && payload?.old?.postId) {
    //   // Xử lý xóa like - cần thêm
    //   const postId = payload.old.postId;
    //   const likeId = payload.old.id;

    //   if (postsMapRef.current.has(postId)) {
    //     const post = postsMapRef.current.get(postId);
    //     const updatedPost = { ...post };

    //     // Loại bỏ like đã xóa khỏi danh sách
    //     updatedPost.postLikes = (updatedPost.postLikes || [])
    //       .filter(like => like.id !== likeId);

    //     postsMapRef.current.set(postId, updatedPost);
    //     setPosts(prevPosts =>
    //       prevPosts.map(p => p.id === postId ? updatedPost : p)
    //     );
    //   }
    // }
    /////
    if (payload?.eventType === 'INSERT' && payload?.new?.postId) {
      const postId = payload.new.postId;

      if (postsMapRef.current.has(postId)) {
        const post = postsMapRef.current.get(postId);

        // Tạo bản sao và cập nhật số lượng comments
        const updatedPost = { ...post };
        if (updatedPost.likes?.[0]?.count !== undefined) {
          updatedPost.likes = [{ count: updatedPost.likes[0].count + 1 }];
        } else {
          updatedPost.likes = [{ count: 1 }];
        }

        // Cập nhật Map và state
        postsMapRef.current.set(postId, updatedPost);
        setPosts(prevPosts =>
          prevPosts.map(p => p.id === postId ? updatedPost : p)
        );
        console.log(`[LIKES] Increased comment count for post ${postId}:`,
          updatedPost.likes?.[0]?.count);
      }
    } else if (payload?.eventType === 'DELETE') {
      let postId = null;
      const likeId = payload.old.id;

      // Phương án 1: Lấy postId từ payload.old nếu có
      if (payload.old?.postId) {
        postId = payload.old.postId;
      }
      // Phương án 2: Tìm trong Map
      else {
        // Duyệt qua tất cả posts để tìm like cần xóa
        postsMapRef.current.forEach((post, key) => {
          const hasLike = post.likes?.some(like => like.id === likeId);
          if (hasLike) {
            postId = key;
            console.log(`[LIKES] Found postId ${postId} by scanning Map`);
          }
        });
      }

      // Nếu tìm được postId, cập nhật post
      if (postId && postsMapRef.current.has(postId)) {

        const post = postsMapRef.current.get(postId);

        // Tạo bản sao và giảm số lượng comments
        const updatedPost = { ...post };
        if (updatedPost.likes?.[0]?.count !== undefined && updatedPost.likes[0].count > 0) {
          updatedPost.likes = [{ count: updatedPost.likes[0].count - 1 }];
        }

        // Cập nhật Map và state
        postsMapRef.current.set(postId, updatedPost);
        setPosts(prevPosts =>
          prevPosts.map(p => p.id === postId ? updatedPost : p)
        );

        console.log(`[Like] Decreased like count for post ${postId}:`,
          updatedPost.comments?.[0]?.count);
      } else {
        console.log(`[LIKES] Could not find postId for like ${likeId}`);
      }
    }

  }, []);


  // Thiết lập kênh realtime và cleanup
  useEffect(() => {
    const channelId = `posts-${Date.now()}`;
    console.log(`Setting up channel: ${channelId}`);

    // Kênh cho posts
    const postsChannel = supabase
      .channel(`${channelId}-posts`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'posts'
      }, handlePostEvent)
      .subscribe(status => console.log(`Posts channel status: ${status}`));

    // Kênh cho comments
    const commentsChannel = supabase
      .channel(`${channelId}-comments`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'comments'
      }, handleCommentEvent)
      .subscribe(status => console.log(`Comments channel status: ${status}`));
    //Kênh cho cotifications
    const notificationsChannel = supabase
      .channel(`${channelId}-notifications`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `receiverId=eq.${user.id}`
      }, handleNewNotification)
      .subscribe(status => console.log(`Notifications channel status: ${status}`));
    // THÊM KÊNH MỚI CHO LIKES
    const likesChannel = supabase
      .channel(`${channelId}-likes`)
      .on('postgres_changes', {
        event: '*', // Lắng nghe cả INSERT và DELETE
        schema: 'public',
        table: 'likes'
      }, handleLikeEvent)
      .subscribe(status => console.log(`Likes channel status: ${status}`));

    // Fetch dữ liệu ban đầu
    getPosts(true);

    return () => {
      console.log('Cleaning up channels');
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(commentsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(likesChannel);
    };
  }, [handlePostEvent, handleCommentEvent, getPosts]);



  return (
    <ScreenWrapper bg='white'>
      <View style={styles.container}>
        {/* header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bún chả Obama</Text>
          <View style={styles.icons}>
            <Pressable onPress={() => router.push('/main/notificationScr')}>
              <Icon.Heart strokeWidth={2} width={hp(3)} height={hp(3)} color={theme.colors.primaryDark} />
              {
                notificationCount > 0 && (
                  <View style={styles.pill}>
                    <Text style={styles.pillText}>
                      {notificationCount}
                    </Text>
                  </View>
                )
              }


            </Pressable>
            <Pressable onPress={() => {
              setNotificationCount(0);
              router.push('/main/newPostScr')
            }}>
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
          ListFooterComponent={hasMore ? (
            <View style={{ marginVertical: posts.length == 0 ? 200 : 30 }}>
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
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: theme.colors.roseLight,
    width: hp(2),
    height: hp(2),
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: hp(1.5),
    color: 'white',
    fontWeight: theme.fonts.bold
  }

})