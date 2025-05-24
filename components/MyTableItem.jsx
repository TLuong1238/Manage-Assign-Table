import { Alert, StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { hp } from '../helper/common'
import { theme } from '../constants/theme'
import { TouchableOpacity } from 'react-native'
import MyAvatar from './MyAvatar'
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
const MyTableItem = (
    {
        item,
        router
    }
) => {
    const handleNotiClick = () => {
        console.log('item:', item);
    }


    return (
        <TouchableOpacity style={styles.container} onPress={handleNotiClick}>
            <MaterialIcons name="table-bar" size={80} color={item.state == 'in_use' ? 'red' : 'gray'} />
            <Text style={styles.tableNumber}>{item.id}</Text>
        </TouchableOpacity>
    )
}

export default MyTableItem

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    nameTitle: {
        flex: 1,
        gap: 2,
    },
    text: {
        fontSize: hp(1.6),
        fontWeight: theme.fonts.medium,
        color: theme.colors.text,
    },
    tableNumber: {
        position: 'absolute', // Đặt số chồng lên icon
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        // backgroundColor: 'rgba(0, 0, 0, 0.5)', // Nền mờ cho số
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        overflow: 'hidden',
        top: 10
    },
})