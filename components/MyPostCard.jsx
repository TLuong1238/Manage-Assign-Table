import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { theme } from '../constants/theme'
import MyAvatar from './MyAvatar'
import { hp, scriptHtmlTags, wp } from '../helper/common'
import moment from 'moment'
import * as Icon from 'react-native-feather'
import RenderHtml from 'react-native-render-html';
import { downloadFile, getSupabaseFileUrl } from '../services/imageService'
import { Image } from 'expo-image'
import { Video } from 'expo-av'
import { createPostLike, removePostLike } from '../services/postServices'
import * as Sharing from 'expo-sharing';
import MyLoading from './MyLoading'

const textStyles = {
    color: theme.colors.dark,
    fontSize: hp(1.75)
}

const tagsStyles = {
    div: textStyles,
    p: textStyles,
    ol: textStyles,
    h1: {
        color: theme.colors.dark
    },
    h4: {
        color: theme.colors.dark
    }
}
const MyPostCard = ({
    item,
    currentUser,
    router,

    hasShadow = true,
    showMoreIcon = true,
    showDeleteIcon = false,
    onDelete = () => { },
    onEdit = () => { },
}) => {
    // console.log('currentUser in MyPostCard:', currentUser);
    const shadowStyles = {
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.06,
        shadowRadious: 6,
        elevation: 1
    }

    // const createAt = moment(item?.created_at).format('MMM D');
    const createAt = moment(item?.created_at).fromNow();
    //
    const [likeCount, setLikeCount] = useState(0);
    const [localLiked, setLocalLiked] = useState(false);
    const [postLikeDetails, setPostLikeDetails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const lastClickTime = useRef(0);


    // console.log('postItem: ', item);
    useEffect(() => {
        // Khởi tạo số lượng like từ item.likes

        if (item?.likes && Array.isArray(item.likes) && item.likes.length > 0) {
            console.log("Detected likes data:", item.likes);

            // Kiểm tra xem likes có cấu trúc count hay không
            if (item.likes[0]?.count !== undefined) {
                // Cấu trúc cũ: likes có chứa count
                setLikeCount(item.likes[0].count);
                console.log("Set count from likes[0].count:", item.likes[0].count);
            } else {
                // Cấu trúc mới: likes là mảng các chi tiết like
                setLikeCount(item.likes.length);
                setPostLikeDetails(item.likes);
                console.log("Set count from likes.length:", item.likes.length);

                // Kiểm tra người dùng đã like bài viết chưa
                const userLiked = item.likes.some(like => like.userId === currentUser?.id);
                setLocalLiked(userLiked);
                console.log("Set localLiked:", userLiked);
            }
        } else {
            // Khởi tạo giá trị mặc định khi không có dữ liệu
            setLikeCount(0);
            setPostLikeDetails([]);
            setLocalLiked(false);
            console.log("No likes data, setting defaults");
        }
    }, [item, currentUser?.id]);

    const onLike = async () => {
        // Chống click spam
        const now = Date.now();
        if (now - lastClickTime.current < 500 || isProcessing) {
            return;
        }

        lastClickTime.current = now;
        setIsProcessing(true);
        setLocalLiked(!localLiked);
        setLikeCount(prev => localLiked ? Math.max(0, prev - 1) : prev + 1);

        try {
            if (localLiked) {
                // Unlike
                let res = await removePostLike(item?.id, currentUser?.id);
                console.log('remove likes response:', res);

                if (!res.success) {
                    // Khôi phục UI nếu API thất bại
                    setLocalLiked(true);
                    setLikeCount(prev => prev + 1);
                    Alert.alert('Post Like:', "Something went wrong!");
                } else {
                    // Cập nhật chi tiết likes
                    setPostLikeDetails(prev =>
                        prev.filter(like => like.userId !== currentUser?.id)
                    );
                }
            } else {
                // Like
                let data = {
                    userId: currentUser?.id,
                    postId: item?.id
                };

                let res = await createPostLike(data);
                console.log('add likes response:', res);

                if (!res.success) {
                    // Khôi phục UI nếu API thất bại
                    setLocalLiked(false);
                    setLikeCount(prev => Math.max(0, prev - 1));
                    Alert.alert('Post Like:', "Something went wrong!");
                } else if (res.data) {
                    // Cập nhật chi tiết likes với data trả về từ API
                    setPostLikeDetails(prev => [...prev, res.data]);
                }
            }
        } catch (error) {
            console.error('Like/unlike error:', error);
            // Khôi phục UI nếu có lỗi
            setLocalLiked(!localLiked);
            setLikeCount(prev => localLiked ? prev + 1 : Math.max(0, prev - 1));
            Alert.alert('Error', 'Could not process like action');
        } finally {
            setTimeout(() => {
                setIsProcessing(false);
            }, 500);
        }
    };

    const openPostDetails = () => {
        if (!showMoreIcon) return null;
        router.push({
            pathname: 'main/postDetailsScr',
            params: { postId: item?.id }
        });
    };
    // likes, share

    const onShare = async () => {
        const hasBody = !!item?.body;
        const isImage = item?.file && item.file.includes('postImages');
        const isVideo = item?.file && item.file.includes('postVideos');

        if (hasBody && !isImage && !isVideo) {
            //text only
            try {
                await Share.share({
                    message: scriptHtmlTags(item?.body) || 'Xem bài viết này!',
                });
            } catch (error) {
                Alert.alert('Không thể chia sẻ nội dung');
            }
            return;
        }

        if (!hasBody && isImage) {
            // pic only
            setLoading(true);
            let url = await downloadFile(getSupabaseFileUrl(item?.file).uri);
            setLoading(false);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(url, {
                    mimeType: 'image/jpeg',
                    dialogTitle: 'Chia sẻ ảnh',
                });
            } else {
                Alert.alert('Không hỗ trợ chia sẻ trên thiết bị này');
            }
            return;
        }

        if (!hasBody && isVideo) {
            //video only
            setLoading(true);
            let url = await downloadFile(getSupabaseFileUrl(item?.file).uri);
            setLoading(false);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(url, {
                    mimeType: 'video/mp4',
                    dialogTitle: 'Chia sẻ video',
                });
            } else {
                Alert.alert('Không hỗ trợ chia sẻ trên thiết bị này');
            }
            return;
        }

        // both
        Alert.alert(
            "Chia sẻ bài viết",
            "Bạn muốn chia sẻ gì?",
            [
                hasBody ? {
                    text: "Nội dung bài viết",
                    onPress: async () => {
                        try {
                            await Share.share({
                                message: scriptHtmlTags(item?.body) || 'Xem bài viết này!',
                            });
                        } catch (error) {
                            Alert.alert('Không thể chia sẻ nội dung');
                        }
                    }
                } : null,
                isImage ? {
                    text: "Chia sẻ ảnh",
                    onPress: async () => {
                        setLoading(true);
                        let url = await downloadFile(getSupabaseFileUrl(item?.file).uri);
                        setLoading(false);
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(url, {
                                mimeType: 'image/jpeg',
                                dialogTitle: 'Chia sẻ ảnh',
                            });
                        } else {
                            Alert.alert('Không hỗ trợ chia sẻ trên thiết bị này');
                        }
                    }
                } : null,
                isVideo ? {
                    text: "Chia sẻ video",
                    onPress: async () => {
                        setLoading(true);
                        let url = await downloadFile(getSupabaseFileUrl(item?.file).uri);
                        setLoading(false);
                        if (await Sharing.isAvailableAsync()) {
                            await Sharing.shareAsync(url, {
                                mimeType: 'video/mp4',
                                dialogTitle: 'Chia sẻ video',
                            });
                        } else {
                            Alert.alert('Không hỗ trợ chia sẻ trên thiết bị này');
                        }
                    }
                } : null,
                { text: "Hủy", style: "cancel" }
            ].filter(Boolean)
        );
    };

    // delete post
    handlePostDelete = () => {
        Alert.alert("Xác nhận", "Bạn có chắc chắn muốn xóa bài viết này không?", [
            {
                text: "Hủy bỏ",
                onPress: () => console.log("Hủy"),
                style: 'cancel'
            },
            {
                text: "Đồng ý",
                onPress: () => onDelete(item),
                style: 'destructive'
            }
        ])


    }

    return (
        <View style={[styles.container, hasShadow && shadowStyles]}>
            <View style={styles.header}>
                {/* User infor and post time */}
                <View style={styles.userInfo}>
                    <MyAvatar
                        size={hp(4.5)}
                        uri={item?.user?.image}
                        rounded={25}
                    />
                    <View style={{ gap: 2 }}>
                        <Text style={styles.username}>{item?.user?.name}</Text>
                        <Text style={styles.postTime}>{createAt}</Text>
                    </View>
                </View>
                {/* post Details */}
                {
                    showMoreIcon && (
                        <TouchableOpacity onPress={openPostDetails}>
                            <Icon.MoreHorizontal
                                stroke={theme.colors.dark} height={hp(3)} width={hp(3)} />
                        </TouchableOpacity>
                    )
                }
                {
                    showDeleteIcon && currentUser?.id == item?.userId && (
                        <View style={styles.actions}>
                            <TouchableOpacity onPress={() => onEdit(item)}>
                                <Icon.Edit
                                    stroke={theme.colors.dark} height={hp(3)} width={hp(3)} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handlePostDelete}>
                                <Icon.Trash2
                                    stroke={'red'} height={hp(3)} width={hp(3)} />
                            </TouchableOpacity>
                        </View>
                    )
                }
            </View>
            {/* post body */}
            <View stye={styles.content}>
                <View style={styles.postBody}>
                    {
                        item?.body && (
                            <RenderHtml
                                contentWidth={wp(100)}
                                source={{ html: item?.body }}
                                tagsStyles={tagsStyles}
                            />
                        )
                    }
                </View>

                {/* post images */}
                {
                    item?.file && item.file?.includes('postImages') && (
                        <Image
                            source={getSupabaseFileUrl(item.file)}
                            transition={100}
                            style={styles.postMedia}
                            contentFit='cover'
                        />
                    )
                }
                {/* post videos */}
                {
                    item?.file && item.file?.includes('postVideos') && (
                        <Video
                            style={styles.postMedia}
                            source={getSupabaseFileUrl(item.file)}
                            useNativeControls
                            resizeMode='cover'
                            isLooping
                        />
                    )
                }
            </View>
            {/* like, commennts, share */}
            <View style={styles.footer}>
                <View style={styles.footerButton}>
                    <TouchableOpacity onPress={onLike}>
                        <Icon.Heart
                            color={localLiked ? theme.colors.rose : theme.colors.textLight}
                            height={30} width={30}
                            fill={localLiked ? theme.colors.rose : 'none'} />
                    </TouchableOpacity>
                    <Text style={styles.count}>
                        {
                            likeCount
                        }
                    </Text>
                </View>
                <View style={styles.footerButton}>
                    <TouchableOpacity onPress={openPostDetails}>
                        <Icon.MessageSquare stroke={theme.colors.rose} height={30} width={30} />
                    </TouchableOpacity>
                    <Text style={styles.count}>
                        {
                            item?.comments && item.comments[0]?.count || 0
                        }
                    </Text>
                </View>
                <View style={styles.footerButton}>
                    {
                        loading ? (
                            <MyLoading />
                        ) : (
                            <TouchableOpacity onPress={onShare}>
                                <Icon.Share2 stroke={theme.colors.rose} height={30} width={30} />
                            </TouchableOpacity>
                        )
                    }

                </View>

            </View>
        </View>

    )
}

export default MyPostCard


const styles = StyleSheet.create({
    container: {
        gap: 10,
        marginBottom: 15,
        borderRadius: 15,
        borderCurve: 'continuous',
        padding: 10,
        paddingVertical: 12,
        backgroundColor: 'white',
        borderWidth: 0.5,
        borderColor: theme.colors.gray,
        shadowColor: '#000'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    userInfo: {
        flexDirection: 'row',
        gap: 10
    },
    content: {
        gap: 10
    },
    postTime: {
        fontSize: hp(1.5),
        color: theme.colors.textLight,
        fontWeight: 'semibold'
    },
    postMedia: {
        height: hp(40),
        width: '100%',
        borderRadius: 15,
        borderCurve: 'continuous'
    },
    postBody: {
        marginLeft: 5
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15
    },
    footerButton: {
        marginLeft: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    count: {
        color: theme.colors.text,
        fontSize: hp(1.5),
    }

})