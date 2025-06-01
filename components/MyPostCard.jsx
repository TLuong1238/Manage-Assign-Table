import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Alert,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Image } from 'expo-image';
import { Video } from 'expo-av';
import moment from 'moment';
import * as Icon from 'react-native-feather';
import RenderHtml from 'react-native-render-html';
import * as Sharing from 'expo-sharing';

import { theme } from '../constants/theme';
import MyAvatar from './MyAvatar';
import MyLoading from './MyLoading';
import { hp, scriptHtmlTags, wp } from '../helper/common';
import { downloadFile, getSupabaseFileUrl, isImageFile, isVideoFile } from '../services/imageService';
import { createPostLike, removePostLike } from '../services/postServices';

// ============= CONSTANTS =============
const DOUBLE_CLICK_DELAY = 500;

const textStyles = {
  color: theme.colors.dark,
  fontSize: hp(1.75)
};

const tagsStyles = {
  div: textStyles,
  p: textStyles,
  ol: textStyles,
  h1: { color: theme.colors.dark },
  h4: { color: theme.colors.dark }
};

const shadowStyles = {
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 1
};

// ============= MAIN COMPONENT =============
const MyPostCard = React.memo(({
  item,
  currentUser,
  router,
  hasShadow = true,
  showMoreIcon = true,
  showDeleteIcon = false,
  onDelete = () => {},
  onEdit = () => {},
}) => {
  // ============= STATES =============
  const [likeCount, setLikeCount] = useState(0);
  const [localLiked, setLocalLiked] = useState(false);
  const [postLikeDetails, setPostLikeDetails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ============= REFS =============
  const lastClickTime = useRef(0);

  // ============= MEMOIZED VALUES =============
  const createAt = useMemo(() => moment(item?.created_at).fromNow(), [item?.created_at]);
  
  const fileUrl = useMemo(() => {
    if (!item?.file) return null;
    try {
      return getSupabaseFileUrl(item.file);
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  }, [item?.file]);

  const isImage = useMemo(() => {
    return item?.file ? isImageFile(item.file) : false;
  }, [item?.file]);

  const isVideo = useMemo(() => {
    return item?.file ? isVideoFile(item.file) : false;
  }, [item?.file]);

  const canEditDelete = useMemo(() => {
    return showDeleteIcon && currentUser?.id === item?.userId;
  }, [showDeleteIcon, currentUser?.id, item?.userId]);

  // ============= EFFECTS =============
  useEffect(() => {
    if (!item?.likes) {
      setLikeCount(0);
      setPostLikeDetails([]);
      setLocalLiked(false);
      return;
    }

    if (Array.isArray(item.likes) && item.likes.length > 0) {
      if (item.likes[0]?.count !== undefined) {
        // Old structure: likes contain count
        setLikeCount(item.likes[0].count);
      } else {
        // New structure: likes is array of like details
        setLikeCount(item.likes.length);
        setPostLikeDetails(item.likes);
        
        // Check if current user liked the post
        const userLiked = item.likes.some(like => like.userId === currentUser?.id);
        setLocalLiked(userLiked);
      }
    } else {
      setLikeCount(0);
      setPostLikeDetails([]);
      setLocalLiked(false);
    }
  }, [item?.likes, currentUser?.id]);

  // ============= HANDLERS =============
  const handleLike = useCallback(async () => {
    // Prevent spam clicking
    const now = Date.now();
    if (now - lastClickTime.current < DOUBLE_CLICK_DELAY || isProcessing) {
      return;
    }

    lastClickTime.current = now;
    setIsProcessing(true);

    // Optimistic update
    const wasLiked = localLiked;
    setLocalLiked(!wasLiked);
    setLikeCount(prev => wasLiked ? Math.max(0, prev - 1) : prev + 1);

    try {
      if (wasLiked) {
        // Unlike
        const res = await removePostLike(item?.id, currentUser?.id);
        
        if (!res.success) {
          // Revert on failure
          setLocalLiked(true);
          setLikeCount(prev => prev + 1);
          Alert.alert('Lỗi', 'Không thể bỏ thích bài viết');
        } else {
          setPostLikeDetails(prev =>
            prev.filter(like => like.userId !== currentUser?.id)
          );
        }
      } else {
        // Like
        const data = {
          userId: currentUser?.id,
          postId: item?.id
        };

        const res = await createPostLike(data);
        
        if (!res.success) {
          // Revert on failure
          setLocalLiked(false);
          setLikeCount(prev => Math.max(0, prev - 1));
          Alert.alert('Lỗi', 'Không thể thích bài viết');
        } else if (res.data) {
          setPostLikeDetails(prev => [...prev, res.data]);
        }
      }
    } catch (error) {
      console.error('Like/unlike error:', error);
      // Revert on error
      setLocalLiked(wasLiked);
      setLikeCount(prev => wasLiked ? prev + 1 : Math.max(0, prev - 1));
      Alert.alert('Lỗi', 'Không thể xử lý thao tác thích');
    } finally {
      setTimeout(() => setIsProcessing(false), DOUBLE_CLICK_DELAY);
    }
  }, [localLiked, isProcessing, item?.id, currentUser?.id]);

  const handlePostDetails = useCallback(() => {
    if (!showMoreIcon || !router) return;
    
    router.push({
      pathname: 'main/postDetailsScr',
      params: { postId: item?.id }
    });
  }, [showMoreIcon, router, item?.id]);

  const handleShare = useCallback(async () => {
    const hasBody = !!item?.body;

    if (hasBody && !isImage && !isVideo) {
      // Text only
      try {
        await Share.share({
          message: scriptHtmlTags(item?.body) || 'Xem bài viết này!',
        });
      } catch (error) {
        console.error('Share text error:', error);
        Alert.alert('Lỗi', 'Không thể chia sẻ nội dung');
      }
      return;
    }

    if (!hasBody && (isImage || isVideo)) {
      // Media only
      await shareMedia(isImage ? 'image/jpeg' : 'video/mp4');
      return;
    }

    if (hasBody && (isImage || isVideo)) {
      // Both content and media
      showShareOptions(hasBody, isImage, isVideo);
    }
  }, [item?.body, isImage, isVideo, fileUrl]);

  const shareMedia = useCallback(async (mimeType) => {
    if (!fileUrl) {
      Alert.alert('Lỗi', 'Không tìm thấy file để chia sẻ');
      return;
    }

    setLoading(true);
    try {
      const url = await downloadFile(fileUrl);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url, {
          mimeType,
          dialogTitle: mimeType.includes('image') ? 'Chia sẻ ảnh' : 'Chia sẻ video',
        });
      } else {
        Alert.alert('Lỗi', 'Không hỗ trợ chia sẻ trên thiết bị này');
      }
    } catch (error) {
      console.error('Share media error:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ file');
    } finally {
      setLoading(false);
    }
  }, [fileUrl]);

  const showShareOptions = useCallback((hasBody, hasImage, hasVideo) => {
    const options = [];

    if (hasBody) {
      options.push({
        text: "Nội dung bài viết",
        onPress: async () => {
          try {
            await Share.share({
              message: scriptHtmlTags(item?.body) || 'Xem bài viết này!',
            });
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể chia sẻ nội dung');
          }
        }
      });
    }

    if (hasImage) {
      options.push({
        text: "Chia sẻ ảnh",
        onPress: () => shareMedia('image/jpeg')
      });
    }

    if (hasVideo) {
      options.push({
        text: "Chia sẻ video",
        onPress: () => shareMedia('video/mp4')
      });
    }

    options.push({ text: "Hủy", style: "cancel" });

    Alert.alert("Chia sẻ bài viết", "Bạn muốn chia sẻ gì?", options);
  }, [item?.body, shareMedia]);

  const handlePostDelete = useCallback(() => {
    Alert.alert(
      "Xác nhận", 
      "Bạn có chắc chắn muốn xóa bài viết này không?", 
      [
        {
          text: "Hủy bỏ",
          style: 'cancel'
        },
        {
          text: "Đồng ý",
          onPress: () => onDelete(item),
          style: 'destructive'
        }
      ]
    );
  }, [onDelete, item]);

  const handleEdit = useCallback(() => {
    onEdit(item);
  }, [onEdit, item]);

  // ============= RENDER =============
  return (
    <View style={[styles.container, hasShadow && shadowStyles]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <MyAvatar
            size={hp(4.5)}
            uri={item?.user?.image}
            rounded={25}
          />
          <View style={styles.userDetails}>
            <Text style={styles.username}>{item?.user?.name}</Text>
            <Text style={styles.postTime}>{createAt}</Text>
          </View>
        </View>

        {/* Action buttons */}
        {showMoreIcon && (
          <TouchableOpacity onPress={handlePostDetails} style={styles.actionButton}>
            <Icon.MoreHorizontal
              stroke={theme.colors.dark}
              height={hp(3)}
              width={hp(3)}
            />
          </TouchableOpacity>
        )}

        {canEditDelete && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={handleEdit} style={styles.actionButton}>
              <Icon.Edit
                stroke={theme.colors.dark}
                height={hp(3)}
                width={hp(3)}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePostDelete} style={styles.actionButton}>
              <Icon.Trash2
                stroke={theme.colors.rose}
                height={hp(3)}
                width={hp(3)}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Post body */}
        {item?.body && (
          <View style={styles.postBody}>
            <RenderHtml
              contentWidth={wp(100)}
              source={{ html: item.body }}
              tagsStyles={tagsStyles}
            />
          </View>
        )}

        {/* Media */}
        {fileUrl && (
          <View style={styles.mediaContainer}>
            {isImage && (
              <Image
                source={{ uri: fileUrl }}
                transition={100}
                style={styles.postMedia}
                contentFit="cover"
              />
            )}
            
            {isVideo && (
              <Video
                style={styles.postMedia}
                source={{ uri: fileUrl }}
                useNativeControls
                resizeMode="cover"
                isLooping={false}
                shouldPlay={false}
              />
            )}
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Like button */}
        <View style={styles.footerButton}>
          <TouchableOpacity 
            onPress={handleLike}
            disabled={isProcessing}
            style={styles.actionButton}
          >
            <Icon.Heart
              color={localLiked ? theme.colors.rose : theme.colors.textLight}
              height={30}
              width={30}
              fill={localLiked ? theme.colors.rose : 'none'}
            />
          </TouchableOpacity>
          <Text style={styles.count}>{likeCount}</Text>
        </View>

        {/* Comment button */}
        <View style={styles.footerButton}>
          <TouchableOpacity onPress={handlePostDetails} style={styles.actionButton}>
            <Icon.MessageSquare
              stroke={theme.colors.textLight}
              height={30}
              width={30}
            />
          </TouchableOpacity>
          <Text style={styles.count}>
            {item?.comments?.[0]?.count || 0}
          </Text>
        </View>

        {/* Share button */}
        <View style={styles.footerButton}>
          {loading ? (
            <MyLoading />
          ) : (
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Icon.Share2
                stroke={theme.colors.textLight}
                height={30}
                width={30}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
});

// ============= STYLES =============
const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 15,
    borderRadius: 25, // ✅ thay theme.radius.lg
    borderCurve: 'continuous',
    padding: wp(3),
    paddingVertical: hp(1.5),
    backgroundColor: 'white',
    borderWidth: 0.5,
    borderColor: theme.colors.gray,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    flex: 1,
  },

  userDetails: {
    gap: 2,
  },

  username: {
    fontSize: hp(1.8),
    fontWeight: '600',
    color: theme.colors.dark,
  },

  postTime: {
    fontSize: hp(1.5),
    color: theme.colors.textLight,
    fontWeight: '500',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  actionButton: {
    padding: wp(1),
  },

  content: {
    gap: hp(1.5),
  },

  postBody: {
    marginLeft: wp(1),
  },

  mediaContainer: {
    borderRadius: 15, // ✅ thay theme.radius.md
    overflow: 'hidden',
  },

  postMedia: {
    height: hp(40),
    width: '100%',
    borderRadius: 15, // ✅ thay theme.radius.md
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(4),
    paddingTop: hp(1),
  },

  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },

  count: {
    color: theme.colors.text,
    fontSize: hp(1.5),
    fontWeight: '500',
  },
});

MyPostCard.displayName = 'MyPostCard';

export default MyPostCard;