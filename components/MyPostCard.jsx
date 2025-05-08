import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { theme } from '../constants/theme'
import MyAvatar from './MyAvatar'
import { hp, wp } from '../helper/common'
import moment from 'moment'
import * as Icon from 'react-native-feather'
import RenderHtml from 'react-native-render-html';
import { getSupabaseFileUrl } from '../services/imageService'
import { Image } from 'expo-image'
import { Video } from 'expo-av'

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
    currentuser,
    router,
    hasShadow = true
}) => {
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
    const likes = [];
    const liked = false;

    const openPostDetails = () => {
        //
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
            <View style = {styles.footer}>
                <View style = {styles.footerButton}>
                    <TouchableOpacity>
                        <Icon.Heart 
                        color={liked? theme.colors.rose : theme.colors.textLight} 
                        height={30} width={30}
                        fill={liked ? theme.colors.rose : 'none'}/>
                    </TouchableOpacity>
                    <Text style = {styles.count}>
                        {
                            likes?.length
                        }
                    </Text>
                </View>
                <View style = {styles.footerButton}>
                    <TouchableOpacity>
                        <Icon.MessageSquare stroke={theme.colors.rose} height={30} width={30}/>
                    </TouchableOpacity>
                    <Text style = {styles.count}>
                        0
                    </Text>
                </View>
                <View style = {styles.footerButton}>
                    <TouchableOpacity>
                        <Icon.Share2 stroke={theme.colors.rose} height={30} width={30}/>
                    </TouchableOpacity>
                    
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