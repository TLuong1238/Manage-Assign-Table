import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Image } from 'react-native';
import { wp } from '../helper/common';

const MyCategory = ({
    title,
    data,
    onPressItem,
}) => {
    return (
        <View style={styles.container}>
            {/* Hiển thị tiêu đề */}
            <Text style={styles.title}>{title}</Text>

            {/* Danh sách cuộn ngang */}
            {data && (
                <FlatList
                    data={data}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={item => item.id?.toString() || Math.random().toString()}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.item} onPress={onPressItem ? () => onPressItem(item) : null}>
                            <View style={{ alignItems: 'center' }}>
                                {item.image && (
                                    <Image source={{ uri: item.image }} style={styles.image} />
                                )}
                                <Text style={styles.itemText}>{item.name}</Text>
                                {item.price !== undefined && (
                                    <Text style={styles.priceText}>{item.price} VNĐ</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}
        </View>
    );
};

export default MyCategory;

const styles = StyleSheet.create({
    container: {
        marginVertical: 10,
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    item: {
        backgroundColor: '#FFBF00',
        padding: 10,
        width: wp(45),
        height: wp(55),
        borderRadius: 10,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    itemText: {
        fontSize: 18,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    priceText: {
        fontSize: 16,
        color: '#fff',
        marginTop: 4,
    },
    image: { 
        width: wp(30), 
        height: wp(30), 
        borderRadius: 8, 
        marginBottom: 8, 
        resizeMode: 'cover'
    },
});