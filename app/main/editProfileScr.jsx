import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'
import { getUserImageSrc, uploadFile } from '../../services/imageService'
import * as Icon from 'react-native-feather'
import MyInput from '../../components/MyInput'
import MyButton from '../../components/MyButton'
import { updateUserData } from '../../services/userService'
import { useRouter } from 'expo-router'
import * as ImagePicker from 'expo-image-picker';
import MyHeader from '../../components/MyHeader';



const EditProfileScr = () => {
    const router = useRouter();
    const { user: currentUser, setUserData } = useAuth();
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState({
        name: "",
        phoneNumber: "",
        image: "",
        bio: "",
        address: ""
    });

    useEffect(() => {
        let mounted = true;
        if (currentUser && mounted) {
            setUser({
                name: currentUser.name || '',
                phone: currentUser.phone || '',
                image: currentUser.image || '',
                bio: currentUser.bio || '',
                address: currentUser.address || ''
            });
        }
        return () => {
            mounted = false;
        };
    }, [currentUser]);


    // const onPickImage = async () => {
    //     let result = await ImagePicker.launchImageLibraryAsync({
    //         mediaTypes: 'images',
    //         aspect: [4, 3],
    //         quality: 0.7,
    //       });
    //     if(!result.canceled){
    //         setUser({...user, image: result.assets[0]})
    //     }
    // }
    const onPickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: false,
                aspect: [1, 1],
                quality: 0.7,
            });

            if (!result.canceled && result.assets[0]) {
                // console.log('Image selected:', result.assets[0]);
                setUser(user => ({
                    ...user,
                    image: result.assets[0].uri
                }));
            }
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Lỗi', 'Không thể chọn ảnh, vui lòng thử lại');
        }
    };
    const onSubmit = async () => {
        try {
            let userData = { ...user };
            let { name, phone, image, bio, address } = userData;
            if (!name || !phone || !bio || !address ||!image) {
                Alert.alert("Thông báo!", "Vui lòng điền hết các form");
                return;
            }
            setLoading(true);
            //  
            if (image && image !== currentUser?.image) {
                let imageRes = await uploadFile('profiles', image, true);
                if (imageRes.success) {
                    userData.image = imageRes.data;
                }
                else userData.image = null;
            }
            // 
            const res = await updateUserData(currentUser?.id, userData);
            if (res.success) {
                Alert.alert("Thành công!", "Cập nhật thông tin thành công");
                setUserData({ ...currentUser, ...userData });
                router.back();
            } else {
                Alert.alert("Lỗi!", "Có lỗi xảy ra, vui lòng thử lại");
            }
        } catch (error) {
            Alert.alert("Lỗi nghiêm trọng!", error);
        } finally {
            setLoading(false);
        }
    }
    // const imageSource = user.image && typeof user.image == 'object' ? user.image.uri : getUserImageSrc(user.image);
    const imageSource = React.useMemo(() => {
        if (!user.image) {
            return require('../../assets/images/defaultUser.png');
        }

        // local url
        if (user.image.startsWith('file://') || user.image.startsWith('content://')) {
            return { uri: user.image };
        }

        // path
        return getUserImageSrc(user.image);
    }, [user.image]);
    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                <ScrollView style={{ flex: 1 }}>
                    <MyHeader title="Edit Profiles" />

                    {/* form */}
                    <View style={styles.form}>
                        <View style={styles.avatarContainer}>
                            <Image source={imageSource} style={styles.avatar} resizeMode='cover' />
                            <Pressable style={styles.camaraIcon} onPress={onPickImage}>
                                <Icon.Camera strokeWidth={3} height={20} width={20} color={'black'} />
                            </Pressable>
                        </View>
                        <Text style={{ fontSize: hp(3), color: theme.colors.text }}>
                            Vui lòng điền thông tin của bạn!
                        </Text>
                        <MyInput
                            icon={<Icon.User stroke={theme.colors.dark} />}
                            placeholder={"Nhập tên của bạn!"}
                            value={user.name}
                            onChangeText={value => setUser({ ...user, name: value })}
                        />
                        <MyInput
                            icon={<Icon.PhoneCall stroke={theme.colors.dark} />}
                            placeholder={"Nhập số điện thoại của bạn!"}
                            value={user.phone}
                            onChangeText={value => setUser({ ...user, phone: value })}
                        />
                        <MyInput
                            icon={<Icon.Home stroke={theme.colors.dark} />}
                            placeholder={"Nhập địa chỉ của bạn!"}
                            value={user.address}
                            onChangeText={value => setUser({ ...user, address: value })}
                        />
                        <MyInput
                            placeholder={"Mô tả một chút về bạn!"}
                            multiline={true}
                            containerStyle={styles.bio}
                            value={user.bio}
                            onChangeText={value => setUser({ ...user, bio: value })}
                        />
                        <MyButton title='Cập nhật' loading={loading} onPress={onSubmit} />
                    </View>
                </ScrollView>

            </View>
        </ScreenWrapper>
    )
}

export default EditProfileScr

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp(2),
    },
    form: {
        gap: 18,
        marginTop: 20
    },
    avatarContainer: {
        height: hp(24),
        width: wp(40),
        alignSelf: 'center'
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: theme.colors.darkLight
    },
    camaraIcon: {
        position: 'absolute',
        bottom: 0,
        right: -10,
        padding: 8,
        borderRadius: 50,
        backgroundColor: 'white',
        shadowColor: theme.colors.textLight,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        borderWidth: 1
    },
    bio: {
        flexDirection: 'row',
        height: hp(15),
        alignItems: 'flex-start',
        paddingVertical: 15,
    }
})