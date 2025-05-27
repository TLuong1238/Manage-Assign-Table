import { StyleSheet, Text, View, TouchableOpacity, Linking, Alert, ScrollView, Image } from 'react-native'
import React from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import MyHeader from '../../components/MyHeader'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import * as Icon from 'react-native-feather'

const LocationScr = () => {
    // Thông tin 2 cơ sở
    const locations = [
        {
            id: 1,
            name: "Bún Chả Obama - Cơ sở 1",
            address: "24 P.Lê Văn Hưu, Phan Chu Trinh, Hai Bà Trưng, Hà Nội",
            phone: "0987207803",
            hours: "8:00 - 20:00 (Hàng ngày)",
            latitude: 21.01794748680883,
            longitude: 105.85381793493502,
            description: "Nơi Tổng thống Obama từng ghé thăm năm 2016",
            image: "https://cafefcdn.com/203337114487263232/2021/7/13/photo-1-16261331934651240029646.jpg",
        },
        {
            id: 2,
            name: "Bún Chả Obama - Cơ sở 2",
            address: "59/14 P. Láng Hạ, Thành Công, Ba Đình, Hà Nội, Vietnam",
            phone: "0987207803",
            hours: "8:00 - 20:00 (Hàng ngày)",
            latitude: 21.01835648378569,
            longitude: 105.81746643507978,
            description: "Cơ sở mới với không gian rộng rãi, hiện đại",
            image: "https://scontent.fhan20-1.fna.fbcdn.net/v/t39.30808-6/299385556_533960378525979_6340263631046135099_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=LehvKh-N9zMQ7kNvwHdCOSK&_nc_oc=AdkqmMPU8iahz-2th9z51qExLOn833PYcp4aHKgcjGrtDGzHgKiU5AhldXbwUy6zL1M&_nc_zt=23&_nc_ht=scontent.fhan20-1.fna&_nc_gid=EyOUQm_uOCWRWPHaSxqktA&oh=00_AfKKCaKKFzLBIZPv93QrOtvdpVusbLJJq03TSqqfMQhMRg&oe=683AD66E",
        }
    ];

    const openMaps = (location) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}&travelmode=driving`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Lỗi", "Không thể mở Google Maps");
            }
        });
    };

    const makeCall = (phoneNumber) => {
        const url = `tel:${phoneNumber}`;

        Linking.canOpenURL(url).then(supported => {
            if (supported) {
                Linking.openURL(url);
            } else {
                Alert.alert("Lỗi", "Không thể thực hiện cuộc gọi");
            }
        });
    };
    //   render Location
    const renderLocation = (location) => (
        <View key={location.id} style={styles.locationCard}>
            {/*image*/}
            <Image source={{ uri: location.image }} style={styles.locationImage} />

            {/* in4 */}
            <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{location.name}</Text>
                <Text style={styles.locationDescription}>{location.description}</Text>

                {/* address */}
                <View style={styles.infoRow}>
                    <Icon.MapPin width={20} height={20} color={theme.colors.primary} />
                    <Text style={styles.infoText}>{location.address}</Text>
                </View>

                {/* phone */}
                <TouchableOpacity
                    style={styles.infoRow}
                    onPress={() => makeCall(location.phone)}
                >
                    <Icon.Phone width={20} height={20} color={theme.colors.primary} />
                    <Text style={[styles.infoText, styles.phoneText]}>{location.phone}</Text>
                </TouchableOpacity>

                {/* time */}
                <View style={styles.infoRow}>
                    <Icon.Clock width={20} height={20} color={theme.colors.primary} />
                    <Text style={styles.infoText}>{location.hours}</Text>
                </View>

                {/*  */}
                <TouchableOpacity
                    style={styles.directionButton}
                    onPress={() => openMaps(location)}
                >
                    <Icon.Navigation width={20} height={20} color="white" />
                    <Text style={styles.directionText}>Chỉ đường</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <ScreenWrapper bg="#FFBF00">
            <View style={styles.container}>
                <MyHeader title="Hệ thống cửa hàng" showBackButton={true} />

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerSubtitle}>
                            Chọn cơ sở gần bạn nhất để được chỉ đường
                        </Text>
                    </View>

                    {/* render locations */}
                    {locations.map(location => renderLocation(location))}

                    {/* Footer info */}
                    <View style={styles.footer}>
                        <View style={styles.footerItem}>
                            <Icon.Star width={24} height={24} color="#FFD700" />
                            <Text style={styles.footerText}>Thương hiệu uy tín từ 2016</Text>
                        </View>
                        <View style={styles.footerItem}>
                            <Icon.Heart width={24} height={24} color="#FF6B6B" />
                            <Text style={styles.footerText}>Hương vị truyền thống Hà Nội</Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </ScreenWrapper>
    )
}

export default LocationScr

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp(4),
    },
    scrollContent: {
        paddingBottom: hp(3),
    },
    header: {
        alignItems: 'center',
    },
    headerSubtitle: {
        fontSize: hp(1.8),
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    locationCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        marginVertical: hp(1),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 5,
        overflow: 'hidden',
    },
    locationImage: {
        width: '100%',
        height: hp(20),
        resizeMode: 'cover',
    },
    locationInfo: {
        padding: wp(4),
    },
    locationName: {
        fontSize: hp(2.5),
        fontWeight: 'bold',
        color: theme.colors.dark,
        marginBottom: hp(0.5),
    },
    locationDescription: {
        fontSize: hp(1.6),
        color: theme.colors.textLight,
        marginBottom: hp(1.5),
        fontStyle: 'italic',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: hp(0.5),
        gap: wp(3),
    },
    infoText: {
        fontSize: hp(1.8),
        color: theme.colors.text,
        flex: 1,
    },
    phoneText: {
        color: theme.colors.primary,
        textDecorationLine: 'underline',
    },
    directionButton: {
        backgroundColor: theme.colors.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(1.5),
        paddingHorizontal: wp(6),
        borderRadius: 25,
        marginTop: hp(2),
        gap: wp(2),
    },
    directionText: {
        color: 'white',
        fontSize: hp(1.8),
        fontWeight: '600',
    },
    footer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: wp(4),
        marginTop: hp(2),
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: hp(1),
        gap: wp(3),
    },
    footerText: {
        fontSize: hp(1.8),
        color: theme.colors.text,
        flex: 1,
    },
})