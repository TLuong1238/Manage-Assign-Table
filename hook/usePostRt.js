import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchPosts } from '../services/postServices';
import { getUserData } from '../services/userService';

export default function usePostRt(user, limit = 10, own = false) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [notificationCount, setNotificationCount] = useState(0);
    const postsMapRef = useRef(new Map());



    // console.log('User in MyRealtime:', user);

    const getPosts = useCallback(async () => {
        if (loading || !hasMore) return;
        setLoading(true);

        try {
            const offset = posts.length;
            let res;
            if (own) {
                res = await fetchPosts(limit, user.id, offset);
            } else {
                res = await fetchPosts(limit, undefined, offset);
            }

            if (res.success) {
                // Thêm post mới vào Map và tránh trùng
                res.data.forEach(post => {
                    postsMapRef.current.set(post.id, post);
                });

                // Cập nhật state (nối thêm vào danh sách)
                setPosts(prev => {
                    // Lọc các post mới chưa có trong prev
                    const prevIds = new Set(prev.map(p => p.id));
                    const newPosts = res.data.filter(post => !prevIds.has(post.id));
                    return [...prev, ...newPosts];
                });

                setHasMore(res.data.length === limit); // Nếu trả về đủ LIMIT thì có thể còn nữa
            }
        } catch (error) {
            console.error('Error fetching posts:', error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, posts.length]);

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
                        setPosts(prevPosts => {
                            // Nếu đã có post này thì không thêm nữa
                            if (prevPosts.some(p => p.id === newPost.id)) return prevPosts;
                            return [newPost, ...prevPosts];
                        });
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
            } else {
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



    //


    useEffect(() => {
        if (!user?.id) return;
        const channelId = `posts-${user.id}`;
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

        // Kênh cho notifications
        const notificationsChannel = supabase
            .channel(`${channelId}-notifications`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `receiverId=eq.${user.id}`
            }, handleNewNotification)
            .subscribe(status => console.log(`Notifications channel status: ${status}`));

        // Kênh cho likes
        const likesChannel = supabase
            .channel(`${channelId}-likes`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'likes'
            }, handleLikeEvent)
            .subscribe(status => console.log(`Likes channel status: ${status}`));

        getPosts();

        return () => {
            console.log('Cleaning up channels');
            supabase.removeChannel(postsChannel);
            supabase.removeChannel(commentsChannel);
            supabase.removeChannel(notificationsChannel);
            supabase.removeChannel(likesChannel);
        };
    }, [user?.id, own]);

    return {
        posts,
        setPosts,
        loading,
        hasMore,
        getPosts,
        notificationCount,
        setNotificationCount,
        postsMapRef
    };
}