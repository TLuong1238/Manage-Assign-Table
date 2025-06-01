import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabaseURL } from '../constants'


/**
 * ✅ Get Supabase file URL
 */


/**
 * ✅ Get user image source - For MyAvatar component
 */
export const getUserImageSrc = imagePath => {
    if (imagePath) {
        return getSupabaseFileUrl(imagePath);
    } else {
        return require('../assets/images/defaultUser.png')
    }
}
export const getSupabaseFileUrl = filePath => {
    if (filePath) {
        return { uri: `${supabaseURL}/storage/v1/object/public/uploads/${filePath}` }
    }
    return null;
}

/**
 * ✅ Get file URL with automatic folder detection
 */
export const getFileUrl = (filePath, folderName = '') => {
    if (!filePath) return null;

    // ✅ Nếu đã là URL đầy đủ thì return luôn
    if (filePath.startsWith('http')) {
        return filePath;
    }

    // ✅ Auto detect folder based on file extension
    let detectedFolder = folderName;
    if (!detectedFolder) {
        if (filePath.includes('profileImages/') || filePath.includes('profile_')) {
            detectedFolder = 'profileImages';
        } else if (filePath.includes('postImages/') || filePath.includes('post_')) {
            detectedFolder = 'postImages';
        } else if (filePath.includes('postVideos/') || filePath.includes('video_')) {
            detectedFolder = 'postVideos';
        }
    }

    // ✅ Construct full path
    const fullPath = detectedFolder && !filePath.startsWith(detectedFolder)
        ? `${detectedFolder}/${filePath}`
        : filePath;

    try {
        const { data } = supabase.storage
            .from('uploads')
            .getPublicUrl(fullPath);

        return data?.publicUrl || null;
    } catch (error) {
        console.error('getFileUrl error:', error);
        return null;
    }
};

/**
 * ✅ Upload file to Supabase storage
 */
export const uploadFile = async (folderName, fileUri, isImage = true) => {
    try {
        if (!fileUri) {
            return { success: false, msg: 'File URI is required' };
        }

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        if (!base64) {
            return { success: false, msg: 'Could not read file' };
        }

        // Generate unique filename
        const fileExt = isImage ? 'jpeg' : 'mp4';
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${folderName}/${fileName}`;

        // Convert base64 to ArrayBuffer
        const arrayBuffer = decode(base64);

        // Upload to Supabase
        const { data, error } = await supabase.storage
            .from('uploads')
            .upload(filePath, arrayBuffer, {
                contentType: isImage ? 'image/jpeg' : 'video/mp4',
                upsert: false
            });

        if (error) {
            console.error('Upload error:', error);
            return { success: false, msg: 'Upload failed' };
        }

        // Return the file path (not full URL)
        return { success: true, data: data.path };
    } catch (error) {
        console.error('uploadFile error:', error);
        return { success: false, msg: 'Upload failed' };
    }
};

/**
 * ✅ Upload user profile image
 */
export const uploadUserImage = async (imageUri) => {
    try {
        return await uploadFile('profileImages', imageUri, true);
    } catch (error) {
        console.error('uploadUserImage error:', error);
        return { success: false, msg: 'Upload profile image failed' };
    }
};

/**
 * ✅ Upload post image
 */
export const uploadPostImage = async (imageUri) => {
    try {
        return await uploadFile('postImages', imageUri, true);
    } catch (error) {
        console.error('uploadPostImage error:', error);
        return { success: false, msg: 'Upload post image failed' };
    }
};

/**
 * ✅ Upload post video
 */
export const uploadPostVideo = async (videoUri) => {
    try {
        return await uploadFile('postVideos', videoUri, false);
    } catch (error) {
        console.error('uploadPostVideo error:', error);
        return { success: false, msg: 'Upload post video failed' };
    }
};

/**
 * ✅ Delete file from Supabase storage
 */
export const deleteFile = async (filePath) => {
    try {
        if (!filePath) return { success: false, msg: 'File path is required' };

        const { error } = await supabase.storage
            .from('uploads')
            .remove([filePath]);

        if (error) {
            console.error('Delete error:', error);
            return { success: false, msg: 'Delete failed' };
        }

        return { success: true };
    } catch (error) {
        console.error('deleteFile error:', error);
        return { success: false, msg: 'Delete failed' };
    }
};

/**
 * ✅ Delete user profile image
 */
export const deleteUserImage = async (imagePath) => {
    try {
        const fullPath = imagePath.startsWith('profileImages/')
            ? imagePath
            : `profileImages/${imagePath}`;

        return await deleteFile(fullPath);
    } catch (error) {
        console.error('deleteUserImage error:', error);
        return { success: false, msg: 'Delete profile image failed' };
    }
};

/**
 * ✅ Check if file is image
 */
export const isImageFile = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return false;

    const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    const lowerPath = filePath.toLowerCase();

    return imageExts.some(ext => lowerPath.includes(ext)) ||
        lowerPath.includes('image') ||
        lowerPath.includes('profileImages') ||
        lowerPath.includes('postImages');
};

/**
 * ✅ Check if file is video
 */
export const isVideoFile = (filePath) => {
    if (!filePath || typeof filePath !== 'string') return false;

    const videoExts = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    const lowerPath = filePath.toLowerCase();

    return videoExts.some(ext => lowerPath.includes(ext)) ||
        lowerPath.includes('video') ||
        lowerPath.includes('postVideos');
};