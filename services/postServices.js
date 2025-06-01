import { supabase } from "../lib/supabase";
import { uploadFile } from "./imageService";

/**
 * ✅ Post states:
 * - 'wait': Chờ duyệt
 * - 'accept': Đã duyệt  
 * - 'reject': Từ chối
 */

// ==================== CRUD OPERATIONS ====================

/**
 * Fetch all posts for admin management
 */
export const fetchAllPosts = async (limit = 20, offset = 0, status = null) => {
  try {
    let query = supabase
      .from('posts')
      .select(`
        *,
        user: users(id, name, image, email),
        likes (count),
        comments (count)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by state if provided
    if (status && ['wait', 'accept', 'reject'].includes(status)) {
      query = query.eq('state', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('fetchAllPosts error:', error);
      return { success: false, msg: 'Không thể tải danh sách bài viết' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('fetchAllPosts error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi tải bài viết' };
  }
};

/**
 * ✅ Fetch posts for regular users (only approved posts)
 */
export const fetchUserPosts = async (limit = 20, offset = 0) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        user: users(id, name, image, email),
        likes (count),
        comments (count)
      `)
      .eq('state', 'accept')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('fetchUserPosts error:', error);
      return { success: false, msg: 'Không thể tải danh sách bài viết' };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('fetchUserPosts error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi tải bài viết' };
  }
};

/**
 * ✅ Create new post (auto set state to 'wait')
 */
export const createPost = async (postData) => {
  try {
    // Handle file upload if exists
    if (postData.file && typeof postData.file === 'object') {
      const isImage = postData.file.type === 'image';
      const folderName = isImage ? 'postImages' : 'postVideos';

      const fileResult = await uploadFile(folderName, postData.file.uri, isImage);
      if (fileResult.success) {
        postData.file = fileResult.data;
      } else {
        return fileResult;
      }
    }

    // Set default state to 'wait' for new posts
    const newPost = {
      ...postData,
      state: 'wait',
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('posts')
      .insert(newPost)
      .select(`
        *,
        user: users(id, name, image, email)
      `)
      .single();

    if (error) {
      console.error('createPost error:', error);
      return { success: false, msg: 'Không thể tạo bài viết' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('createPost error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi tạo bài viết' };
  }
};

/**
 * ✅ Update existing post
 */
export const updatePost = async (postId, updateData) => {
  try {
    // Handle file upload if new file provided
    if (updateData.file && typeof updateData.file === 'object') {
      const isImage = updateData.file.type === 'image';
      const folderName = isImage ? 'postImages' : 'postVideos';

      const fileResult = await uploadFile(folderName, updateData.file.uri, isImage);
      if (fileResult.success) {
        updateData.file = fileResult.data;
      } else {
        return fileResult;
      }
    }

    const updatedPost = {
      ...updateData,
    };

    const { data, error } = await supabase
      .from('posts')
      .update(updatedPost)
      .eq('id', postId)
      .select(`
        *,
        user: users(id, name, image, email)
      `)
      .single();

    if (error) {
      console.error('updatePost error:', error);
      return { success: false, msg: 'Không thể cập nhật bài viết' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('updatePost error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi cập nhật bài viết' };
  }
};

/**
 * ✅ Delete post
 */
export const removePost = async (postId) => {
  try {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      console.error('removePost error:', error);
      return { success: false, msg: 'Không thể xóa bài viết' };
    }

    return { success: true, data: { postId } };
  } catch (error) {
    console.error('removePost error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi xóa bài viết' };
  }
};

// ==================== POST APPROVAL OPERATIONS ====================

/**
 * ✅ Approve post (set state to 'accept')
 */
export const approvePost = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({
        state: 'accept',
      })
      .eq('id', postId)
      .select(`
        *,
        user: users(id, name, image, email)
      `)
      .single();

    if (error) {
      console.error('approvePost error:', error);
      return { success: false, msg: 'Không thể duyệt bài viết' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('approvePost error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi duyệt bài viết' };
  }
};

/**
 * ✅ Reject post (set state to 'reject')
 */
export const rejectPost = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({
        state: 'reject',
      })
      .eq('id', postId)
      .select(`
        *,
        user: users(id, name, image, email)
      `)
      .single();

    if (error) {
      console.error('rejectPost error:', error);
      return { success: false, msg: 'Không thể từ chối bài viết' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('rejectPost error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi từ chối bài viết' };
  }
};

/**
 * ✅ Reset post state back to waiting
 */
export const resetPostToWaiting = async (postId) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .update({
        state: 'wait',
      })
      .eq('id', postId)
      .select(`
        *,
        user: users(id, name, image, email)
      `)
      .single();

    if (error) {
      console.error('resetPostToWaiting error:', error);
      return { success: false, msg: 'Không thể đặt lại trạng thái bài viết' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('resetPostToWaiting error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi đặt lại trạng thái' };
  }
};

// ==================== STATISTICS ====================

/**
 * ✅ Get post statistics
 */
export const getPostStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('state')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('getPostStatistics error:', error);
      return { success: false, msg: 'Không thể tải thống kê' };
    }

    const stats = {
      total: data.length,
      wait: data.filter(p => p.state === 'wait').length,
      accept: data.filter(p => p.state === 'accept').length,
      reject: data.filter(p => p.state === 'reject').length
    };

    return { success: true, data: stats };
  } catch (error) {
    console.error('getPostStatistics error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi tải thống kê' };
  }
};

// ==================== INTERACTION OPERATIONS ====================

/**
 * ✅ Like/Unlike post
 */
export const likePost = async (postId) => {
  try {
    // Check if already liked
    const { data: existingLike, error: checkError } = await supabase
      .from('postLikes')
      .select('id')
      .eq('postId', postId)
      .eq('userId', (await supabase.auth.getUser()).data.user.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('postLikes')
        .delete()
        .eq('id', existingLike.id);

      if (error) throw error;
    } else {
      // Like
      const { error } = await supabase
        .from('postLikes')
        .insert({
          postId,
          userId: (await supabase.auth.getUser()).data.user.id
        });

      if (error) throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('likePost error:', error);
    return { success: false, msg: 'Không thể thích bài viết' };
  }
};

/**
 * ✅ Create comment
 */
export const createComment = async (postId, commentText) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        postId,
        userId: (await supabase.auth.getUser()).data.user.id,
        text: commentText
      })
      .select(`
        *,
        user: users(id, name, image)
      `)
      .single();

    if (error) {
      console.error('createComment error:', error);
      return { success: false, msg: 'Không thể tạo bình luận' };
    }

    return { success: true, data };
  } catch (error) {
    console.error('createComment error:', error);
    return { success: false, msg: 'Lỗi hệ thống khi tạo bình luận' };
  }
};
