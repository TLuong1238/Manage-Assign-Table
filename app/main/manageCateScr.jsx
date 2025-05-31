import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import * as Icon from 'react-native-feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import { fetchCate, searchCategories, deleteCate } from '../../services/cateServiec'

import { useDebounce } from '../../hook/useDebounce'
const manageCateScr = () => {
    const router = useRouter();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Sử dụng debounce với delay 500ms
    const debouncedSearchText = useDebounce(searchText, 500);

    // Lấy danh sách danh mục
    const getCategories = async () => {
        setLoading(true);
        const result = await fetchCate();
        if (result.success) {
            setCategories(result.data);
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    // Tìm kiếm danh mục với debounce
    const performSearch = async (searchTerm) => {
        if (searchTerm.trim() === '') {
            await getCategories();
            return;
        }

        setLoading(true);
        const result = await searchCategories(searchTerm.trim());
        if (result.success) {
            setCategories(result.data);
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    // Effect để xử lý debounced search
    useEffect(() => {
        performSearch(debouncedSearchText);
    }, [debouncedSearchText]);

    // Load data lần đầu
    useEffect(() => {
        getCategories();
    }, []);

    // Xử lý thay đổi text search
    const handleSearchTextChange = (text) => {
        setSearchText(text);
    };

    // Xóa danh mục
    const handleDeleteCategory = (category) => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa danh mục "${category.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const result = await deleteCate(category.id);
                        if (result.success) {
                            Alert.alert('Thành công', 'Xóa danh mục thành công!');
                            getCategories();
                        } else {
                            Alert.alert('Lỗi', result.msg);
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    };

    // Sửa danh mục
    const handleEditCategory = (category) => {
        router.push({
            pathname: '/main/detailsCateScr',
            params: {
                categoryId: category.id,
                mode: 'edit'
            }
        });
    };

    // Thêm danh mục mới
    const handleAddCategory = () => {
        router.push({
            pathname: '/main/detailsCateScr',
            params: { mode: 'add' }
        });
    };

    // Refresh danh sách
    const onRefresh = async () => {
        setRefreshing(true);
        setSearchText(''); // Clear search khi refresh
        await getCategories();
        setRefreshing(false);
    };

    // Render item danh mục
    const renderCategoryItem = ({ item }) => (
        <Pressable
            style={styles.categoryItem}
            onPress={() => handleEditCategory(item)}
        >
            

            <View style={styles.categoryInfo}>
                <Text style={styles.categoryName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.categoryDescription} numberOfLines={2}>
                    {item.description || 'Không có mô tả'}
                </Text>
                <Text style={styles.categoryDate}>
                    Tạo: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                </Text>
            </View>

            <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteCategory(item)}
            >
                <MaterialIcons name="delete" size={24} color="#ff4757" />
            </Pressable>
        </Pressable>
    );

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <MyBackButton />
                    <Text style={styles.title}>Quản lý danh mục</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon.Search stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm danh mục..."
                        placeholderTextColor={theme.colors.textLight}
                        value={searchText}
                        onChangeText={handleSearchTextChange}
                    />
                    {searchText.length > 0 && (
                        <Pressable onPress={() => setSearchText('')}>
                            <MaterialIcons name="clear" size={20} color={theme.colors.textLight} />
                        </Pressable>
                    )}
                </View>

                {/* Categories List */}
                <View style={styles.listContainer}>
                    <FlatList
                        data={categories}
                        renderItem={renderCategoryItem}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="category" size={60} color={theme.colors.textLight} />
                                <Text style={styles.emptyText}>
                                    {loading ? 'Đang tải...' : 'Chưa có danh mục nào'}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    Nhấn nút + để thêm danh mục mới
                                </Text>
                            </View>
                        }
                    />
                </View>

                {/* Floating Add Button */}
                <Pressable
                    style={styles.floatingButton}
                    onPress={handleAddCategory}
                >
                    <MaterialIcons name="add" size={30} color="white" />
                </Pressable>
            </View>
        </ScreenWrapper>
    );
};

export default manageCateScr;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp(4),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: hp(2.5),
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        marginBottom: 15,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.text,
    },
    listContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 15,
    },
    categoryItem: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
    },
    categoryInfo: {
        flex: 1,
        marginRight: 10,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 5,
    },
    categoryDescription: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 5,
        lineHeight: 18,
    },
    categoryDate: {
        fontSize: 11,
        color: theme.colors.textLight,
    },
    deleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        fontSize: 18,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginTop: 20,
        fontWeight: '600',
    },
    emptySubText: {
        fontSize: 14,
        color: theme.colors.textLight,
        textAlign: 'center',
        marginTop: 10,
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
});