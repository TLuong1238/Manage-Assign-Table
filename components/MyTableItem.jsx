import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React from 'react'
import { hp } from '../helper/common'
import { theme } from '../constants/theme'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { getTimeUntilNextBill, getStatusDisplayInfo } from '../services/tableService';

const MyTableItem = ({
    item,
    tableClick,
    isSelected = false
}) => {
    // Lấy thông tin hiển thị dựa trên trạng thái
    const statusInfo = getStatusDisplayInfo(item);

    let bgColor = 'white';
    let iconColor = 'gray';
    let borderColor = '#eee';
    let iconName = statusInfo.icon;

    if (item.status === 'occupied') {
        bgColor = '#ff4757'; // Đỏ - đang có khách
        iconColor = 'white';
        borderColor = '#ff4757';
    } else if (item.status === 'reserved') {
        bgColor = '#ffa502'; // Cam - đã đặt, chưa đến giờ
        iconColor = 'white';
        borderColor = '#ffa502';
    } else if (item.status === 'ready') {
        bgColor = '#ff6b6b'; // Đỏ nhạt - đã đến giờ, chưa checkin
        iconColor = 'white';
        borderColor = '#ff6b6b';
    } else if (isSelected) {
        bgColor = '#2ed573'; // Xanh lá cho bàn được chọn
        iconColor = 'white';
        borderColor = '#2ed573';
    }

    // Tính thời gian còn lại
    const timeUntil = (item.status === 'reserved' && item.bill) ? getTimeUntilNextBill(item.bill) : null;
    const getBookingTime = () => {
        if (item.bill && item.bill.time) {
            const bookingTime = new Date(item.bill.time);
            return bookingTime.toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        return null;
    };
    return (
        <TouchableOpacity
            style={[
                styles.container,
                {
                    backgroundColor: bgColor,
                    borderColor: borderColor,
                    borderWidth: 2
                }
            ]}
            onPress={() => tableClick(item)}
            activeOpacity={0.7}
        >
            {/* TOP SECTION - Tầng và Số bàn cùng hàng */}
            <View style={styles.topSection}>
                {/* Tầng */}
                <View style={styles.floorBadge}>
                    <Text style={styles.floorText}>T{item.floor}</Text>
                </View>

                {/* Số bàn */}
                <Text style={[
                     styles.tableNumber,
                    { color: item.status !== 'empty' ? 'white' : 'black' }
                ]}>
                    {"B" + item.id}
                </Text>

                {/* Status dot */}
                <View style={[
                    styles.statusDot,
                    { backgroundColor: statusInfo.color }
                ]} />
            </View>

            {/* MIDDLE SECTION - Icon */}
            <View style={styles.middleSection}>
                <MaterialIcons
                    name={iconName}
                    size={36}
                    color={iconColor}
                />
            </View>

            {/* BOTTOM SECTION - Thông tin khách hàng */}
            <View style={styles.bottomSection}>
                {/* Status badge */}
                {item.status !== 'empty' && (
                    <View style={[styles.statusBadge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                        <Text style={styles.statusBadgeText}>
                            {item.status === 'occupied' ? 'Đang sử dụng' :
                                item.status === 'reserved' ? 'Đã đặt' :
                                    item.status === 'ready' ? 'Bàn sẵn sàng' : ''}
                        </Text>
                    </View>
                )}

                {/* Thông tin khi có khách */}
                {item.status === 'occupied' && item.bill && (
                    <View style={styles.customerInfo}>
                        <Text style={styles.customerName} numberOfLines={1}>
                            {item.bill.name || 'Khách'}
                        </Text>
                        <Text style={styles.peopleCount}>
                            {item.bill.num_people} người
                        </Text>
                    </View>
                )}

                {/* Thông tin đặt bàn */}
                {(item.status === 'reserved' || item.status === 'ready') && item.bill && (
                    <View style={styles.reservationInfo}>
                        <Text style={styles.reservationName} numberOfLines={1}>
                            {item.bill.name || 'Đặt bàn'}
                        </Text>
                        {item.status === 'reserved' && timeUntil && !timeUntil.isOverdue && (
                            <Text style={styles.timeUntil}>
                                {/* {timeUntil.minutes}:{timeUntil.seconds.toString().padStart(2, '0')} */}
                                {getBookingTime()} - Còn lại {timeUntil.minutes} phút
                            </Text>
                        )}
                        {item.status === 'reserved' && timeUntil && timeUntil.isOverdue && (
                            <Text style={styles.timeUntil}>
                                Khách đến trễ!
                            </Text>
                        )}
                        {item.status === 'ready' && (
                            <Text style={styles.readyText}>Đã đến giờ!</Text>
                        )}
                    </View>
                )}
            </View>
        </TouchableOpacity>
    )
}

export default MyTableItem

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 6,
        borderRadius: 16,
        minHeight: 130,
        minWidth: 100,
        position: 'relative',
        paddingVertical: 8,
        paddingHorizontal: 8,
        justifyContent: 'space-between',
    },

    // TOP SECTION - Tầng, Số bàn, Status dot cùng hàng
    topSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center', // Căn giữa theo chiều dọc
        height: 24, // Fixed height
        marginBottom: 4,
    },
    floorBadge: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
        minWidth: 24, // Đảm bảo width tối thiểu
        alignItems: 'center',
    },
    floorText: {
        fontSize: 9,
        color: 'white',
        fontWeight: '600',
        textAlign: 'center',
    },
    tableNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        alignSelf: 'center',
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white',
    },

    // MIDDLE SECTION - Chỉ có icon
    middleSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
    },

    // BOTTOM SECTION - Thông tin khách hàng
    bottomSection: {
        height: 36,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    statusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: 2,
    },
    statusBadgeText: {
        fontSize: 8,
        color: 'white',
        fontWeight: 'bold',
    },

    // Customer info styles
    customerInfo: {
        alignItems: 'center',
        width: '100%',
        flexDirection: 'row',
    },
    customerName: {
        fontSize: 9,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        marginBottom: 1,
    },
    peopleCount: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },

    // Reservation info styles
    reservationInfo: {
        alignItems: 'center',
        width: '100%',
    },
    reservationName: {
        fontSize: 9,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        marginBottom: 1,
    },
    timeUntil: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    readyText: {
        fontSize: 8,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        fontWeight: 'bold',
    },
});