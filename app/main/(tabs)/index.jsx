import { Pressable, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MyAvatar from '../../../components/MyAvatar'
import MyButton from '../../../components/MyButton'

const index = () => {
    const { user } = useAuth()
    const router = useRouter();

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Bún chả Obama - Admin</Text>
                    <View style={styles.icons}>
                        <Pressable onPress={() => router.push('/main/profileScr')}>
                            <MyAvatar
                                uri={user?.image}
                            />
                        </Pressable>
                    </View>
                </View>
                
                {/* Admin Management Buttons */}
                <View style={styles.adminButtonContainer}>
                    <View style={styles.adminButtonRow}>
                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageUserScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="people" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý tài khoản</Text>
                        </View>

                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageCateScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="category" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý danh mục</Text>
                        </View>

                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageProductScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="restaurant-menu" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý sản phẩm</Text>
                        </View>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    )
}

export default index

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginHorizontal: wp(4)
    },
    title: {
        fontSize: hp(3.5),
        fontWeight: 'bold',
        color: theme.colors.text
    },
    // Admin Management Styles
    adminButtonContainer: {
        marginHorizontal: wp(4),
        marginTop: 50,
    },
    adminButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    adminButtonItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    adminButton: {
        width: wp(25),
        height: wp(25),
        backgroundColor: 'white',
        borderRadius: 15,
    },
    adminButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 2,
    },
})