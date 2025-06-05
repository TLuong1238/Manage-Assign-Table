import { Alert, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import * as Icon from 'react-native-feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import { fetchProduct, searchProducts, deleteProduct } from '../../services/productService'
import { fetchCate } from '../../services/cateService'
import { useDebounce } from '../../hook/useDebounce'

const manageProductScr = () => {
    const router = useRouter();
    const [products, setProducts] = useState([]);
    const [allProducts, setAllProducts] = useState([]); // Lưu toàn bộ sản phẩm
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null); // Danh mục được chọn
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const debouncedSearchText = useDebounce(searchText, 500);

    // Lấy danh sách sản phẩm
    const getProducts = async () => {
        setLoading(true);
        const result = await fetchProduct();
        if (result.success) {
            setAllProducts(result.data); // Lưu toàn bộ
            setProducts(result.data); // Hiển thị ban đầu
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    // Lấy danh sách danh mục
    const getCategories = async () => {
        const result = await fetchCate();
        if (result.success) {
            setCategories(result.data);
        }
    };

    // Lọc sản phẩm theo danh mục
    const filterProductsByCategory = (categoryId) => {
        if (!categoryId) {
            // Nếu không chọn danh mục, hiển thị tất cả
            setProducts(allProducts);
        } else {
            // Lọc theo danh mục
            const filtered = allProducts.filter(product => product.cateId === categoryId);
            setProducts(filtered);
        }
    };

    // Tìm kiếm sản phẩm
    const performSearch = async (searchTerm) => {
        if (searchTerm.trim() === '') {
            // Nếu không có từ khóa tìm kiếm, áp dụng filter danh mục
            filterProductsByCategory(selectedCategory?.id);
            return;
        }

        setLoading(true);
        const result = await searchProducts(searchTerm.trim());
        if (result.success) {
            let filteredResults = result.data;

            // Nếu có chọn danh mục, lọc thêm theo danh mục
            if (selectedCategory) {
                filteredResults = result.data.filter(product => product.cateId === selectedCategory.id);
            }

            setProducts(filteredResults);
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    // Chọn danh mục
    const selectCategory = (category) => {
        setSelectedCategory(category);
        setShowCategoryModal(false);

        // Reset tìm kiếm khi chọn danh mục
        setSearchText('');

        // Lọc sản phẩm theo danh mục
        filterProductsByCategory(category?.id);
    };

    // Xóa filter danh mục
    const clearCategoryFilter = () => {
        setSelectedCategory(null);
        setSearchText('');
        setProducts(allProducts);
    };

    useEffect(() => {
        performSearch(debouncedSearchText);
    }, [debouncedSearchText]);

    useEffect(() => {
        getProducts();
        getCategories();
    }, []);

    // Xóa sản phẩm
    const handleDeleteProduct = useCallback((product) => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa sản phẩm "${product.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const result = await deleteProduct(product.id);
                        if (result.success) {
                            Alert.alert('Thành công', 'Xóa sản phẩm thành công!');
                            getProducts();
                        } else {
                            Alert.alert('Lỗi', result.msg);
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    }, []);

    // Sửa sản phẩm
    const handleEditProduct = useCallback((product) => {
        router.push({
            pathname: '/main/detailsProductScr',
            params: {
                productId: product.id,
                mode: 'edit'
            }
        });
    }, [router]);

    // Thêm sản phẩm mới
    const handleAddProduct = useCallback(() => {
        router.push({
            pathname: '/main/detailsProductScr',
            params: { mode: 'add' }
        });
    }, [router]);

    // Refresh danh sách
    const onRefresh = async () => {
        setRefreshing(true);
        setSearchText('');
        setSelectedCategory(null);
        await getProducts();
        await getCategories();
        setRefreshing(false);
    };

    // Xử lý thay đổi text search
    const handleSearchTextChange = (text) => {
        setSearchText(text);
    };

    // Format giá
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(price);
    };

    // Render item sản phẩm
    const renderProductItem = ({ item }) => (
        <Pressable
            style={styles.productItem}
            onPress={() => handleEditProduct(item)}
        >
            <View style={styles.productImageContainer}>
                {item.image ? (
                    <Image
                        source={{ uri: item.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={styles.placeholderImage}>
                        <MaterialIcons name="restaurant" size={30} color={theme.colors.textLight} />
                    </View>
                )}
            </View>

            <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.productCategory}>
                    Danh mục: {item.categories?.name || 'Chưa phân loại'}
                </Text>
                <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
                <Text style={styles.productDescription} numberOfLines={2}>
                    {item.description || 'Không có mô tả'}
                </Text>
                <Text style={styles.productDate}>
                    Tạo: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                </Text>
            </View>

            <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteProduct(item)}
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
                    <Text style={styles.title}>Quản lý sản phẩm</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon.Search stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm sản phẩm..."
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

                {/* Category Filter */}
                <View style={styles.filterContainer}>
                    <Pressable
                        style={styles.categoryFilterButton}
                        onPress={() => setShowCategoryModal(true)}
                    >
                        <MaterialIcons name="category" size={20} color={theme.colors.primary} />
                        <Text style={styles.categoryFilterText}>
                            {selectedCategory ? selectedCategory.name : 'Tất cả danh mục'}
                        </Text>
                        <MaterialIcons name="keyboard-arrow-down" size={20} color={theme.colors.primary} />
                    </Pressable>

                    {/* Clear filter button */}
                    {selectedCategory && (
                        <Pressable
                            style={styles.clearFilterButton}
                            onPress={clearCategoryFilter}
                        >
                            <MaterialIcons name="clear" size={18} color="#ff4757" />
                        </Pressable>
                    )}
                </View>

                {/* Products List */}
                <View style={styles.listContainer}>
                    <FlatList
                        data={products}
                        renderItem={renderProductItem}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="restaurant" size={60} color={theme.colors.textLight} />
                                <Text style={styles.emptyText}>
                                    {loading ? 'Đang tải...' :
                                        selectedCategory ? `Không có sản phẩm nào trong danh mục "${selectedCategory.name}"` :
                                            'Chưa có sản phẩm nào'}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    Nhấn nút + để thêm sản phẩm mới
                                </Text>
                            </View>
                        }
                    />
                </View>

                {/* Category Selection Modal */}
                <Modal
                    visible={showCategoryModal}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={() => setShowCategoryModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Chọn danh mục</Text>
                                <Pressable onPress={() => setShowCategoryModal(false)}>
                                    <MaterialIcons name="close" size={24} color={theme.colors.dark} />
                                </Pressable>
                            </View>

                            <View style={styles.modalList}>
                                {/* Option "Tất cả danh mục" */}
                                <TouchableOpacity
                                    style={[
                                        styles.categoryOption,
                                        !selectedCategory && styles.selectedCategoryOption
                                    ]}
                                    onPress={() => selectCategory(null)}
                                >
                                    <Text style={[
                                        styles.categoryOptionText,
                                        !selectedCategory && styles.selectedCategoryOptionText
                                    ]}>
                                        Tất cả danh mục
                                    </Text>
                                    {!selectedCategory && (
                                        <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                                    )}
                                </TouchableOpacity>

                                {/* Danh sách các danh mục */}
                                {categories.map(category => (
                                    <TouchableOpacity
                                        key={category.id}
                                        style={[
                                            styles.categoryOption,
                                            selectedCategory?.id === category.id && styles.selectedCategoryOption
                                        ]}
                                        onPress={() => selectCategory(category)}
                                    >
                                        <Text style={[
                                            styles.categoryOptionText,
                                            selectedCategory?.id === category.id && styles.selectedCategoryOptionText
                                        ]}>
                                            {category.name}
                                        </Text>
                                        {selectedCategory?.id === category.id && (
                                            <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Floating Add Button */}
                <Pressable
                    style={styles.floatingButton}
                    onPress={handleAddProduct}
                >
                    <MaterialIcons name="add" size={30} color="white" />
                </Pressable>
            </View>
        </ScreenWrapper>
    );
};

export default manageProductScr;

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
        marginBottom: 10,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.text,
    },
    filterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        gap: 10,
    },
    categoryFilterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    categoryFilterText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    clearFilterButton: {
        backgroundColor: 'white',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#ff4757',
    },
    listContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 20,
        paddingHorizontal: 15,
    },
    productItem: {
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
    productImageContainer: {
        marginRight: 15,
    },
    productImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    productInfo: {
        flex: 1,
        marginRight: 10,
    },
    productName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 5,
    },
    productCategory: {
        fontSize: 12,
        color: theme.colors.primary,
        marginBottom: 3,
        fontWeight: '600',
    },
    productPrice: {
        fontSize: 14,
        color: '#e74c3c',
        fontWeight: 'bold',
        marginBottom: 5,
    },
    productDescription: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 5,
    },
    productDate: {
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
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    modalList: {
        paddingBottom: 20,
    },
    categoryOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedCategoryOption: {
        backgroundColor: '#f0f8ff',
    },
    categoryOptionText: {
        fontSize: 16,
        color: theme.colors.text,
    },
    selectedCategoryOptionText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});