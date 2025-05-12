import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useState } from 'react'
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
    hasShadow = true
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
    const [likes, setLikes] = useState([]);
    const [loading, setLoading] = useState(false);


    // console.log('postItem: ', item);
    useEffect(() => {
        setLikes(item?.postLikes);
    }, [])

    const openPostDetails = () => {
        //
    }
    const onLike = async () => {
        if (liked) {
            let UpdateLikes = likes.filter(likes => likes.userId != currentUser?.id);

            setLikes([...UpdateLikes]);
            // console.log('data like :', data);
            let res = await removePostLike(item?.id, currentUser?.id);
            console.log('remove likes: ', res);

            if (!res.success) {
                Alert.alert('Post Like:', "Some thing wrong!")
            }
        } else {
            let data = {
                userId: currentUser?.id,
                postId: item?.id
            }
            setLikes([...likes, data]);
            // console.log('data like :', data);
            let res = await createPostLike(data);
            console.log('add likes: ', res);

            if (!res.success) {
                Alert.alert('Post Like:', "Some thing wrong!")
            }
        }


    }
    //
    // const onShare = async () => {
    //     let context = {message: scriptHtmlTags(item?.body)};

    //     if(item?.file){
    //         let url = await downloadFile(getSupabaseFileUrl(item?.file).uri);
    //         context.url = url;
    //         console.log('ddax share', context)
    //     }

    //     Share.share(context);
    // } 
    const onShare = async () => {
    const hasBody = !!item?.body;
    const isImage = item?.file && item.file.includes('postImages');
    const isVideo = item?.file && item.file.includes('postVideos');

    if (hasBody && !isImage && !isVideo) {
        // Chỉ có text
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
        // Chỉ có ảnh
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
        // Chỉ có video
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

    // Có cả nội dung và media
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

    const liked = likes.filter(likes => likes.userId == currentUser?.id)[0] ? true : false;

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
                <TouchableOpacity onPress={openPostDetails}>
                    <Icon.MoreHorizontal
                        stroke={theme.colors.dark} height={hp(3)} width={hp(3)} />
                </TouchableOpacity>
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
                            color={liked ? theme.colors.rose : theme.colors.textLight}
                            height={30} width={30}
                            fill={liked ? theme.colors.rose : 'none'} />
                    </TouchableOpacity>
                    <Text style={styles.count}>
                        {
                            likes?.length
                        }
                    </Text>
                </View>
                <View style={styles.footerButton}>
                    <TouchableOpacity>
                        <Icon.MessageSquare stroke={theme.colors.rose} height={30} width={30} />
                    </TouchableOpacity>
                    <Text style={styles.count}>
                        0
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
    }

})