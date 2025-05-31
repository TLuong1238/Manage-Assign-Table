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
            <MaterialIcons 
                name={iconName} 
                size={50} 
                color={iconColor} 
            />
            
            {/* Số bàn */}
            <Text style={[
                styles.tableNumber,
                { color: item.status !== 'empty' ? 'white' : 'black' }
            ]}>
                {item.id}
            </Text>

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
                            {timeUntil.minutes}:{timeUntil.seconds.toString().padStart(2, '0')}
                        </Text>
                    )}
                    {item.status === 'ready' && (
                        <Text style={styles.readyText}>Đã đến giờ!</Text>
                    )}
                </View>
            )}

            {/* Status indicator */}
            <View style={[
                styles.statusDot,
                { backgroundColor: statusInfo.color }
            ]} />

            {/* Tầng indicator */}
            <View style={styles.floorBadge}>
                <Text style={styles.floorText}>T{item.floor}</Text>
            </View>

            {/* Status badge */}
            {item.status !== 'empty' && (
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusBadgeText}>
                        {item.status === 'occupied' ? 'KHÁCH' : 
                         item.status === 'reserved' ? 'ĐẶT' : 
                         item.status === 'ready' ? 'SẴN' : ''}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    )
}

export default MyTableItem

const styles = StyleSheet.create({
    container: {
        flex: 1,
        margin: 6,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        minWidth: 100,
        position: 'relative',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    tableNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
        textAlign: 'center',
    },
    customerInfo: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        alignItems: 'center',
    },
    customerName: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        marginBottom: 2,
    },
    peopleCount: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
    },
    reservationInfo: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        alignItems: 'center',
    },
    reservationName: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
        textAlign: 'center',
        marginBottom: 2,
    },
    timeUntil: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    readyText: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.9)',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    statusDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: 'white',
    },
    floorBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    floorText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '600',
    },
    statusBadge: {
        position: 'absolute',
        top: 30,
        left: 8,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusBadgeText: {
        fontSize: 8,
        color: 'white',
        fontWeight: 'bold',
    },
});