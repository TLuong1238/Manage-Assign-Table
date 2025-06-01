import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { approvePost as approvePostService, rejectPost as rejectPostService } from '../services/postServices';

export const usePostRt = (user, initialStatus = 'wait') => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statistics, setStatistics] = useState({
    total: 0,
    wait: 0,
    accept: 0,
    reject: 0
  });
  const [currentStatus, setCurrentStatus] = useState(initialStatus);

  // ✅ Approve post
  const approvePost = useCallback(async (postId) => {
    try {
      const result = await approvePostService(postId);
      if (!result.success) {
        Alert.alert('Lỗi', result.msg);
        return;
      }

      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, state: 'accept' } : post
      ));

      setStatistics(prev => ({
        ...prev,
        wait: Math.max(0, prev.wait - 1),
        accept: prev.accept + 1
      }));

      Alert.alert('Thành công', 'Đã duyệt bài viết');
    } catch (error) {
      console.error('approvePost error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi duyệt bài viết');
    }
  }, []);

  // ✅ Reject post
  const rejectPost = useCallback(async (postId) => {
    try {
      const result = await rejectPostService(postId);
      if (!result.success) {
        Alert.alert('Lỗi', result.msg);
        return;
      }

      setPosts(prev => prev.map(post => 
        post.id === postId ? { ...post, state: 'reject' } : post
      ));

      setStatistics(prev => ({
        ...prev,
        wait: Math.max(0, prev.wait - 1),
        reject: prev.reject + 1
      }));

      Alert.alert('Thành công', 'Đã từ chối bài viết');
    } catch (error) {
      console.error('rejectPost error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi từ chối bài viết');
    }
  }, []);

  // ✅ Delete post
  const deletePost = useCallback(async (postId) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        Alert.alert('Lỗi', 'Không thể xóa bài viết');
        return;
      }

      setPosts(prev => prev.filter(post => post.id !== postId));
      setStatistics(prev => {
        const newStats = { ...prev, total: Math.max(0, prev.total - 1) };
        if (currentStatus === 'wait') newStats.wait = Math.max(0, prev.wait - 1);
        else if (currentStatus === 'accept') newStats.accept = Math.max(0, prev.accept - 1);
        else if (currentStatus === 'reject') newStats.reject = Math.max(0, prev.reject - 1);
        return newStats;
      });

      Alert.alert('Thành công', 'Đã xóa bài viết');
    } catch (error) {
      console.error('deletePost error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa bài viết');
    }
  }, [currentStatus]);

  // ✅ Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('posts')
        .select(`*, user: users(id, name, image, email)`)
        .order('created_at', { ascending: false });

      if (currentStatus !== 'all') {
        query = query.eq('state', currentStatus);
      }

      const { data, error } = await query;

      if (error) {
        Alert.alert('Lỗi', 'Không thể tải danh sách bài viết');
        return;
      }

      setPosts(data || []);
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải bài viết');
    } finally {
      setLoading(false);
    }
  }, [currentStatus]);

  // ✅ Fetch statistics
  const fetchStatistics = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('posts').select('state');
      if (error) return;

      const stats = {
        total: data.length,
        wait: data.filter(p => p.state === 'wait').length,
        accept: data.filter(p => p.state === 'accept').length,
        reject: data.filter(p => p.state === 'reject').length
      };

      setStatistics(stats);
    } catch (error) {
      console.error('fetchStatistics error:', error);
    }
  }, []);

  // ✅ Filter by status
  const filterByStatus = useCallback((status) => {
    setCurrentStatus(status);
  }, []);

  // ✅ Search posts
  const searchPosts = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  // ✅ Refresh posts
  const refreshPosts = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchPosts(), fetchStatistics()]);
    setRefreshing(false);
  }, [fetchPosts, fetchStatistics]);

  useEffect(() => {
    fetchPosts();
    fetchStatistics();
  }, [currentStatus]);

  return {
    posts,
    loading,
    refreshing,
    searchQuery,
    statistics,
    currentStatus,
    hasMore: false,
    approvePost,
    rejectPost,
    deletePost,
    filterByStatus,
    searchPosts,
    refreshPosts,
    loadMore: () => {},
    resetPost: () => {}
  };
};