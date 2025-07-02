import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import MyButton from '../../components/MyButton'
import MyInput from '../../components/MyInput'
import * as Icon from 'react-native-feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getProductById, updateProduct, createProduct, deleteProduct } from '../../services/productService'
import { fetchCate } from '../../services/cateService'
import * as ImagePicker from 'expo-image-picker'

const detailsProductScr = () => {
    const router = useRouter();
    const { productId, mode } = useLocalSearchParams();
    const nameRef = useRef(null);
    const descriptionRef = useRef(null);
    const priceRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [product, setProduct] = useState(null);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedImage, setSelectedImage] = useState(null);
    const [initialLoading, setInitialLoading] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const isEditMode = mode === 'edit';
    const isAddMode = mode === 'add';

    // Lấy danh sách danh mục
    useEffect(() => {
        const loadCategories = async () => {
            const result = await fetchCate();
            if (result.success) {
                setCategories(result.data);
            }
        };
        loadCategories();
    }, []);

    // Lấy thông tin sản phẩm nếu là chế độ sửa
    useEffect(() => {
        const loadProduct = async () => {
            if (isEditMode && productId && categories.length > 0) { 
                setInitialLoading(true);
                const result = await getProductById(productId);
                if (result.success) {
                    setProduct(result.data);
                    nameRef.current = result.data.name;
                    descriptionRef.current = result.data.description || '';
                    priceRef.current = result.data.price?.toString() || '';

                    // Tìm category được chọn - sử dụng category_id
                    const selectedCat = categories.find(cat => cat.id === result.data.cateId);
                    setSelectedCategory(selectedCat || null);
                    setSelectedImage(result.data.image);
                } else {
                    Alert.alert('Lỗi', result.msg);
                    router.back();
                }
                setInitialLoading(false);
            }
        };

        loadProduct();
    }, [productId, isEditMode, categories]);

    // Chọn ảnh từ thư viện
    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // Chụp ảnh
    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert('Thông báo', 'Cần quyền truy cập camera!');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setSelectedImage(result.assets[0].uri);
        }
    };

    // Hiển thị menu chọn ảnh
    const showImagePicker = () => {
        Alert.alert(
            'Chọn ảnh',
            'Bạn muốn chọn ảnh từ đâu?',
            [
                { text: 'Hủy', style: 'cancel' },
                { text: 'Thư viện', onPress: pickImage },
                { text: 'Chụp ảnh', onPress: takePhoto },
            ]
        );
    };

    // Chọn danh mục
    const selectCategory = (category) => {
        setSelectedCategory(category);
        setShowCategoryModal(false);
    };

    const handleSubmit = async () => {
        if (!nameRef.current || nameRef.current.trim() === '') {
            Alert.alert('Thông báo', 'Vui lòng nhập tên sản phẩm!');
            return;
        }

        if (!priceRef.current || isNaN(parseFloat(priceRef.current))) {
            Alert.alert('Thông báo', 'Vui lòng nhập giá hợp lệ!');
            return;
        }

        if (!selectedCategory) {
            Alert.alert('Thông báo', 'Vui lòng chọn danh mục!');
            return;
        }

        const productData = {
            name: nameRef.current.trim(),
            description: descriptionRef.current?.trim() || '',
            price: parseFloat(priceRef.current),
            cateId: selectedCategory.id,
            image: selectedImage,
        };

        setLoading(true);

        let result;
        if (isEditMode) {
            result = await updateProduct(productId, productData);
        } else {
            result = await createProduct(productData);
        }

        if (result.success) {
            Alert.alert(
                'Thành công',
                isEditMode ? 'Cập nhật sản phẩm thành công!' : 'Thêm sản phẩm thành công!',
                [
                    {
                        text: 'OK',
                        onPress: () => router.back()
                    }
                ]
            );
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    const handleDelete = () => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa sản phẩm "${product?.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const result = await deleteProduct(productId);
                        if (result.success) {
                            Alert.alert(
                                'Thành công',
                                'Xóa sản phẩm thành công!',
                                [
                                    {
                                        text: 'OK',
                                        onPress: () => router.back()
                                    }
                                ]
                            );
                        } else {
                            Alert.alert('Lỗi', result.msg);
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    };

    const removeImage = () => {
        Alert.alert(
            'Xác nhận xóa',
            'Bạn có chắc chắn muốn xóa ảnh này?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => setSelectedImage(null)
                }
            ]
        );
    };

    if (initialLoading) {
        return (
            <ScreenWrapper bg={'#FFBF00'}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            </ScreenWrapper>
        );
    }


    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <MyBackButton />
                    <Text style={styles.title}>
                        {isEditMode ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
                    </Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Form */}
                <View style={styles.formContainer}>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                    >
                        <View style={styles.form}>
                            {/* Image Section */}
                            <View style={styles.imageSection}>
                                <View style={styles.imageWrapper}>
                                    <Pressable
                                        style={[
                                            styles.imageContainer,
                                            selectedImage && styles.imageContainerWithImage
                                        ]}
                                        onPress={showImagePicker}
                                    >
                                        {selectedImage ? (
                                            <Image source={{ uri: selectedImage }} style={styles.productImage} />
                                        ) : (
                                            <View style={styles.placeholderImage}>
                                                <MaterialIcons name="add-a-photo" size={40} color={theme.colors.textLight} />
                                                <Text style={styles.placeholderText}>Nhấn để chọn ảnh</Text>
                                            </View>
                                        )}
                                    </Pressable>

                                    {/* Delete Image Button */}
                                    {selectedImage && (
                                        <Pressable style={styles.deleteImageButton} onPress={removeImage}>
                                            <MaterialIcons name="close" size={20} color="white" />
                                        </Pressable>
                                    )}
                                </View>
                            </View>

                            <Text style={styles.label}>Tên sản phẩm *</Text>
                            <MyInput
                                icon={<Icon.Package stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />}
                                placeholder="Nhập tên sản phẩm..."
                                defaultValue={product?.name || ''}
                                onChangeText={value => nameRef.current = value}
                            />

                            <Text style={styles.label}>Danh mục *</Text>
                            <Pressable style={styles.categorySelector} onPress={() => setShowCategoryModal(true)}>
                                <MaterialIcons name="category" size={20} color={theme.colors.dark} />
                                <Text style={[styles.categorySelectorText, !selectedCategory && styles.placeholderText]}>
                                    {selectedCategory ? selectedCategory.name : 'Chọn danh mục...'}
                                </Text>
                                <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.colors.dark} />
                            </Pressable>

                            <Text style={styles.label}>Giá *</Text>
                            <MyInput
                                icon={<MaterialIcons name="attach-money" size={20} color={theme.colors.dark} />}
                                placeholder="Nhập giá sản phẩm..."
                                defaultValue={product?.price?.toString() || ''}
                                keyboardType="numeric"
                                onChangeText={value => priceRef.current = value}
                            />

                            <Text style={styles.label}>Mô tả</Text>
                            <MyInput
                                icon={<Icon.FileText stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />}
                                placeholder="Nhập mô tả sản phẩm..."
                                defaultValue={product?.description || ''}
                                multiline={true}
                                numberOfLines={4}
                                onChangeText={value => descriptionRef.current = value}
                                inputStyle={styles.textArea}
                            />

                            <MyButton
                                title={isEditMode ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm'}
                                loading={loading}
                                onPress={handleSubmit}
                                buttonStyle={styles.submitButton}
                            />

                            {/* Delete Button for Edit Mode */}
                            {isEditMode && (
                                <MyButton
                                    title="Xóa sản phẩm"
                                    onPress={handleDelete}
                                    buttonStyle={[styles.submitButton, styles.deleteButton]}
                                    textStyle={styles.deleteButtonText}
                                />
                            )}
                        </View>
                    </ScrollView>
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

                            <ScrollView style={styles.modalList}>
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
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScreenWrapper>
    );
};

export default detailsProductScr;

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
    formContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 30,
        paddingHorizontal: 20,
    },
    scrollContent: {
        paddingBottom: 30,
    },
    form: {
        gap: 20,
    },
    imageSection: {
        alignItems: 'center',
        marginBottom: 10,
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.gray,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    productImage: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    placeholderImage: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        marginTop: 5,
        fontSize: 12,
        color: theme.colors.textLight,
        textAlign: 'center',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: -15,
    },
    categorySelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.gray,
        paddingHorizontal: 15,
        paddingVertical: 15,
    },
    categorySelectorText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: theme.colors.text,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    submitButton: {
        marginTop: 20,
        backgroundColor: theme.colors.primary,
    },
    deleteButton: {
        backgroundColor: '#ff4757',
        marginTop: 10,
    },
    deleteButtonText: {
        color: 'white',
    },
    loadingText: {
        fontSize: 16,
        color: theme.colors.text,
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
        maxHeight: '70%',
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
        maxHeight: 300,
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
    imageWrapper: {
        position: 'relative',
        alignItems: 'center',
        padding: 10, 
    },
    imageContainer: {
        width: 120,
        height: 120,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: theme.colors.gray,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
    },
    imageContainerWithImage: {
        borderWidth: 0, 
        borderStyle: 'solid',
    },
    deleteImageButton: {
        position: 'absolute',
        top: 5, 
        right: 5,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ff4757',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    },
});