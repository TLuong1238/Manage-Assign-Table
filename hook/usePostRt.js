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
    }, [loading, hasMore, posts.length, limit, own, user?.id]);

    // Xử lý sự kiện realtime với memoization
    const handlePostEvent = useCallback(async (payload) => {
        const { eventType, new: newData, old: oldData } = payload;
        console.log(`[POSTS] Received ${eventType} event:`, payload);

        try {
            switch (eventType) {
                case 'INSERT':
                    if (newData?.id) {
                        // Kiểm tra xem post đã tồn tại chưa
                        if (postsMapRef.current.has(newData.id)) {
                            console.log(`[POSTS] Post ${newData.id} already exists, skipping`);
                            return;
                        }

                        // Lấy thông tin user và tạo cấu trúc post đầy đủ
                        const res = await getUserData(newData.userId);
                        const newPost = {
                            ...newData,
                            likes: [], // Đảm bảo likes là array
                            comments: [{ count: 0 }], // Đảm bảo comments có structure đúng
                            user: res.success ? res.data : {}
                        };

                        // Thêm vào Map
                        postsMapRef.current.set(newPost.id, newPost);

                        // Cập nhật state - thêm vào đầu danh sách
                        setPosts(prevPosts => {
                            // Double check để tránh duplicate
                            if (prevPosts.some(p => p.id === newPost.id)) {
                                console.log(`[POSTS] Post ${newPost.id} already in state`);
                                return prevPosts;
                            }
                            console.log(`[POSTS] Added new post ${newPost.id} to state`);
                            return [newPost, ...prevPosts];
                        });
                    }
                    break;

                case 'UPDATE':
                    if (newData?.id) {
                        if (postsMapRef.current.has(newData.id)) {
                            // Lấy post hiện tại từ Map
                            const currentPost = postsMapRef.current.get(newData.id);

                            // Tạo post đã cập nhật, giữ nguyên likes và comments
                            const updatedPost = {
                                ...currentPost, // Giữ nguyên likes, comments, user
                                ...newData, // Cập nhật các field mới
                                likes: currentPost.likes, // Đảm bảo không mất likes
                                comments: currentPost.comments, // Đảm bảo không mất comments
                                user: currentPost.user // Đảm bảo không mất user info
                            };

                            // Cập nhật Map
                            postsMapRef.current.set(updatedPost.id, updatedPost);

                            // Cập nhật state
                            setPosts(prevPosts =>
                                prevPosts.map(post =>
                                    post.id === updatedPost.id ? updatedPost : post
                                )
                            );

                            console.log(`[POSTS] Updated post ${updatedPost.id}`);
                        } else {
                            console.log(`[POSTS] Post ${newData.id} not found in Map for update`);
                        }
                    }
                    break;

                case 'DELETE':
                    if (oldData?.id) {
                        // Kiểm tra post có tồn tại không
                        if (postsMapRef.current.has(oldData.id)) {
                            // Xóa khỏi Map
                            postsMapRef.current.delete(oldData.id);

                            // Xóa khỏi state
                            setPosts(prevPosts => {
                                const filteredPosts = prevPosts.filter(post => post.id !== oldData.id);
                                console.log(`[POSTS] Deleted post ${oldData.id} from state`);
                                return filteredPosts;
                            });
                        } else {
                            console.log(`[POSTS] Post ${oldData.id} not found in Map for deletion`);
                        }
                    }
                    break;

                default:
                    console.log(`[POSTS] Unknown event type: ${eventType}`);
                    break;
            }
        } catch (error) {
            console.error(`[POSTS] Error handling ${eventType} event:`, error);
        }
    }, []);

    // Thiết lập kênh comments riêng biệt
    const handleCommentEvent = useCallback(async (payload) => {
        const { eventType, new: newData, old: oldData } = payload;
        console.log(`[COMMENTS] Received ${eventType} event:`, payload);

        try {
            switch (eventType) {
                case 'INSERT':
                    if (newData?.postId) {
                        const postId = newData.postId;

                        if (postsMapRef.current.has(postId)) {
                            const post = postsMapRef.current.get(postId);

                            // Tạo bản sao và tăng số lượng comments
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

                            console.log(`[COMMENTS] Increased comment count for post ${postId} to:`,
                                updatedPost.comments[0].count);
                        } else {
                            console.log(`[COMMENTS] Post ${postId} not found for comment INSERT`);
                        }
                    }
                    break;

                case 'UPDATE':
                    if (newData?.postId) {
                        const postId = newData.postId;

                        if (postsMapRef.current.has(postId)) {
                            const post = postsMapRef.current.get(postId);

                            // Tạo bản sao - UPDATE thường không thay đổi số lượng
                            const updatedPost = { ...post };

                            // Cập nhật Map và state
                            postsMapRef.current.set(postId, updatedPost);
                            setPosts(prevPosts =>
                                prevPosts.map(p => p.id === postId ? updatedPost : p)
                            );

                            console.log(`[COMMENTS] Updated comment for post ${postId}`);
                        } else {
                            console.log(`[COMMENTS] Post ${newData.postId} not found for comment UPDATE`);
                        }
                    }
                    break;

                case 'DELETE':
                    let postId = null;
                    const commentId = oldData?.id;

                    // Tìm postId từ payload hoặc từ data cũ
                    if (oldData?.postId) {
                        postId = oldData.postId;
                    } else {
                        console.log(`[COMMENTS] No postId in DELETE payload for comment ${commentId}`);
                        // Không thể tìm postId từ Map vì comments không được lưu trong posts
                        // Cần phải có postId trong payload.old
                        return;
                    }

                    if (postId && postsMapRef.current.has(postId)) {
                        const post = postsMapRef.current.get(postId);

                        // Tạo bản sao và giảm số lượng comments
                        const updatedPost = { ...post };

                        if (updatedPost.comments?.[0]?.count !== undefined && updatedPost.comments[0].count > 0) {
                            updatedPost.comments = [{ count: updatedPost.comments[0].count - 1 }];
                        } else {
                            // Đảm bảo không bị số âm
                            updatedPost.comments = [{ count: 0 }];
                        }

                        // Cập nhật Map và state
                        postsMapRef.current.set(postId, updatedPost);
                        setPosts(prevPosts =>
                            prevPosts.map(p => p.id === postId ? updatedPost : p)
                        );

                        console.log(`[COMMENTS] Decreased comment count for post ${postId} to:`,
                            updatedPost.comments[0].count);
                    } else {
                        console.log(`[COMMENTS] Post ${postId} not found for comment DELETE`);
                    }
                    break;

                default:
                    console.log(`[COMMENTS] Unknown event type: ${eventType}`);
                    break;
            }
        } catch (error) {
            console.error(`[COMMENTS] Error handling ${eventType} event:`, error);
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

                // Tạo bản sao và thêm like mới
                const updatedPost = { ...post };

                // Đảm bảo likes là array và thêm like mới
                if (Array.isArray(updatedPost.likes)) {
                    // Kiểm tra like đã tồn tại chưa
                    const existingLike = updatedPost.likes.find(like => like.id === payload.new.id);
                    if (!existingLike) {
                        updatedPost.likes = [...updatedPost.likes, payload.new];
                        console.log(`[LIKES] Added like ${payload.new.id} to post ${postId}`);
                    } else {
                        console.log(`[LIKES] Like ${payload.new.id} already exists for post ${postId}`);
                        return;
                    }
                } else {
                    updatedPost.likes = [payload.new];
                    console.log(`[LIKES] Initialized likes array for post ${postId}`);
                }

                // Cập nhật Map và state
                postsMapRef.current.set(postId, updatedPost);
                setPosts(prevPosts =>
                    prevPosts.map(p => p.id === postId ? updatedPost : p)
                );
            } else {
                console.log(`[LIKES] Post ${postId} not found for like INSERT`);
            }

        } else if (payload?.eventType === 'DELETE') {
            const likeId = payload.old?.id;
            let postId = payload.old?.postId;

            // Nếu không có postId trong payload, tìm trong Map
            if (!postId) {
                postsMapRef.current.forEach((post, key) => {
                    const hasLike = post.likes?.some(like => like.id === likeId);
                    if (hasLike) {
                        postId = key;
                        console.log(`[LIKES] Found postId ${postId} by scanning Map for like ${likeId}`);
                    }
                });
            }

            // Nếu tìm được postId, xóa like
            if (postId && postsMapRef.current.has(postId)) {
                const post = postsMapRef.current.get(postId);

                // Tạo bản sao và xóa like
                const updatedPost = { ...post };

                if (Array.isArray(updatedPost.likes)) {
                    const beforeCount = updatedPost.likes.length;
                    updatedPost.likes = updatedPost.likes.filter(like => like.id !== likeId);
                    const afterCount = updatedPost.likes.length;

                    if (beforeCount > afterCount) {
                        console.log(`[LIKES] Removed like ${likeId} from post ${postId}`);
                    } else {
                        console.log(`[LIKES] Like ${likeId} not found in post ${postId} likes array`);
                    }
                }

                // Cập nhật Map và state
                postsMapRef.current.set(postId, updatedPost);
                setPosts(prevPosts =>
                    prevPosts.map(p => p.id === postId ? updatedPost : p)
                );
            } else {
                console.log(`[LIKES] Could not find post for like ${likeId} deletion`);
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
    }, [user?.id, own, handlePostEvent, handleCommentEvent, handleNewNotification, handleLikeEvent]);

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