import { supabase } from "../lib/supabase";
import { uploadFile } from "./imageService";

export const createOrUpdatePost = async (post) => {
 try {
    //upload images
    if( post.file && typeof post.file == 'object'){
        let isImage = post?.file?.type == 'image';

        let folderName =isImage? 'postImages' : 'postVideos';
        
        let fileResult = await uploadFile(folderName, post?.file?.uri, isImage);
        if(fileResult.success) post.file = fileResult.data;
        else {
            return fileResult;
        }
        //
        const {data, error} = await supabase
        .from('posts')
        .upsert(post)
        .select()
        .single();


        if(error) {
            console.log('create post error: '. error);
            return {success: false, msg: 'Không thể tạo post'};
        }

        return {success: true, data:data};
    }
    // Xử lý chỉ có text 
    const { data, error } = await supabase
      .from('posts')
      .upsert(post)
      .select()
      .single();

    if (error) {
      console.log('create post error:', error);
      return { success: false, msg: 'Không thể tạo post' };
    }

    return { success: true, data };
 }catch(error) {
    console.log('createPost error: ', error);
    return {success: false, msg: 'Không thể tạo post' };
 } 
}

// fetch Post
export const fetchPosts = async (limit = 15) => {
 try {
    const {data, error} = await supabase
    .from('posts')
    .select(`
        *,
        user: users(id, name, image),
        postLikes (*)
    `)
    .order('created_at', {ascending: false})
    .limit(limit);

    if(error) {
        console.log('fetchPost error: ', error);
        return {success: false, msg: 'Không thể fetch post' };
    }
    return {success: true, data: data};
    
    

 }catch(error) {
    console.log('fetchPost error: ', error);
    return {success: false, msg: 'Không thể fetch post' };
 } 
}

// post Like
export const createPostLike = async (postLike) => {
 try {
    const {data, error} = await supabase
    .from('postLikes')
    .insert(postLike)
    .select()
    .single();

    if(error) {
        console.log('postLike error: ', error);
        return {success: false, msg: 'Không thể like post' };
    }
    return {success: true, data: data};
    
    

 }catch(error) {
    console.log('postLike error: ', error);
    return {success: false, msg: 'Không thể like post' };
 } 
}
// remove Like
export const removePostLike = async (postId, userId) => {
 try {
    const {error} = await supabase
    .from('postLikes')
    .delete()
    .eq('userId', userId)
    .eq('postId', postId)

    if(error) {
        console.log('postLike error: ', error);
        return {success: false, msg: 'Không thể xóa like post' };
    }
    return {success: true};
    
    

 }catch(error) {
    console.log('postLike error: ', error);
    return {success: false, msg: 'Không thể xóa like post' };
 } 
}