import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import * as Icon from 'react-native-feather';
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MyAvatar from '../../../components/MyAvatar'
import MyButton from '../../../components/MyButton'

import Fontisto from '@expo/vector-icons/Fontisto';
import MyCategory from '../../../components/MyCategory'
import { fetchProduct } from '../../../services/productService'
import { fetchCate } from '../../../services/cateServiec'

const index = () => {
    const { user } = useAuth()
    const router = useRouter();
    const [searchText, setSearchText] = useState('');

    const [products, setProducts] = useState([]);
    const [cates, setCates] = useState([]);

    const getProduct = useCallback(async () => {
        const res = await fetchProduct();
        if (res.success) {
            setProducts(res.data);
        }

    })

    const getCate = useCallback(async () => {
        const res = await fetchCate();
        if (res.success) {
            setCates(res.data);
        }
    })

    useEffect(() => {
        getProduct();
        getCate();
    }, []);

    const handlePressItem = (item) => {
        console.log('Selected item:', item);
        router.push({
            pathname: '../main/productDetailScr',
            params: { productId: item.id }
        });
    }

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Bún chả Obama</Text>
                    <View style={styles.icons}>

                        <Pressable onPress={() => router.push('/main/profileScr')}>
                            <MyAvatar
                                uri={user?.image}
                            />
                        </Pressable>
                    </View>
                </View>
                {/* search */}
                <View style={styles.searchContainer}>
                    <Icon.Search stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm..."
                        placeholderTextColor={theme.colors.textLight}
                        value={searchText}
                        onChangeText={(text) => setSearchText(text)}
                    />
                </View>
                {/* button */}
                <View style={styles.buttonContainer}>

                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <MyButton
                            onPress={() => router.push('/main/assignTableScr')}
                            buttonStyle={{ width: wp(20), height: wp(20) }}
                            icon={<MaterialIcons name="dinner-dining" size={40} color="black" />}
                        />
                        <Text style={{ color: 'white', padding: 2, fontSize: 18, fontWeight: 'bold' }}>Đặt bàn</Text>
                    </View>

                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 15 }}>
                        <MyButton
                            onPress={() => router.push('../main/locationScr')}
                            buttonStyle={{ width: wp(20), height: wp(20) }}
                            icon={<Fontisto name="map" size={40} color="black" />}
                        />
                        <Text style={{ color: 'white', padding: 2, fontSize: 18, fontWeight: 'bold' }}>Vị trí</Text>
                    </View>
                </View>
                {/* content */}
                <View style={styles.content}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ flexGrow: 1 }}
                    >
                        <View style={styles.cover}>
                            <Image
                                source={require('../../../assets/images/coverImg2.jpg')}
                                resizeMode='cover'
                                style={styles.image}
                            />
                        </View>

                        {/* voucher */}
                        <Text style={{ fontSize: 24, color: 'black', fontWeight: 'bold', paddingLeft: 10, }}>Ưu đãi đặc biệt:</Text>
                        <View style={{ flexDirection: 'row' }}>
                            <View style={styles.voucherContainer}>
                                <Image
                                    source={require('../../../assets/images/fire.png')}
                                    style={{ width: wp(20), height: wp(20), borderRadius: 10 }}
                                />
                                <Text style={styles.textVoucher}>20%</Text>
                                <Text style={{ color: 'white' }}>Ưu đãi giờ vàng</Text>
                            </View>
                            <View style={styles.voucherContainer}>
                                <Image
                                    source={require('../../../assets/images/price-tag.png')}
                                    style={{ width: wp(20), height: wp(20), borderRadius: 10 }}
                                />
                                <Text style={styles.textVoucher}>8%</Text>
                                <Text style={{ color: 'white' }}>Ưu đãi dành cho thành viên</Text>
                            </View>
                        </View>
                        {/* category */}
                        {cates.map(cate => (
                            <View key={cate.id} style={{ marginTop: 20 }}>
                                <MyCategory
                                    title={cate.name}
                                    data={products.filter(p => p.cateId === cate.id)}
                                    // Bạn có thể custom renderItem trong MyCategory hoặc render ở đây
                                    onPressItem={(item) => handlePressItem(item)}
                                />
                            </View>
                        ))}
                    </ScrollView>
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
    cover: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        marginHorizontal: wp(4)
    },
    title: {
        fontSize: hp(3.5),
        fontWeight: 'bold',
        color: theme.colors.text
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        width: wp(90),
        height: 50,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginBottom: 10,
        alignSelf: 'center',
    },
    content: {
        flex: 1,
        backgroundColor: '#fff7bf',
        marginTop: 10,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        marginHorizontal: wp(2),
    },
    buttonContainer: {
        flexDirection: 'row',
        marginVertical: wp(2),
        marginHorizontal: wp(4),
        height: hp(10),
        alignItems: 'flex-start',
        gap: 15,
        // backgroundColor: 'white',
    },
    image: {
        width: wp(92),
        height: hp(25),
        // borderTopLeftRadius: 20,
        // borderTopRightRadius: 20,
        borderRadius: 20,

    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.dark,
    },
    voucherContainer: {
        backgroundColor: '#FFBF00',
        padding: 10,
        width: wp(45),
        height: wp(45),
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 10,
    },
    textVoucher: {
        fontSize: 40,
        color: 'white',
        fontWeight: 'bold',

    },
})