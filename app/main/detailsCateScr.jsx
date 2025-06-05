import { Alert, StyleSheet, Text, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import MyButton from '../../components/MyButton'
import MyInput from '../../components/MyInput'
import * as Icon from 'react-native-feather'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getCategoryById, updateCategory, createCategory } from '../../services/cateService'

const detailsCateScr = () => {
  const router = useRouter();
  const { categoryId, mode } = useLocalSearchParams();
  const nameRef = useRef(null);
  const descriptionRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);

  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  // Lấy thông tin danh mục nếu là chế độ sửa
  useEffect(() => {
    const loadCategory = async () => {
      if (isEditMode && categoryId) {
        setInitialLoading(true);
        const result = await getCategoryById(categoryId);
        if (result.success) {
          setCategory(result.data);
          nameRef.current = result.data.name;
          descriptionRef.current = result.data.description || '';
        } else {
          Alert.alert('Lỗi', result.msg);
          router.back();
        }
        setInitialLoading(false);
      }
    };

    loadCategory();
  }, [categoryId, isEditMode]);

  const handleSubmit = async () => {
    if (!nameRef.current || nameRef.current.trim() === '') {
      Alert.alert('Thông báo', 'Vui lòng nhập tên danh mục!');
      return;
    }

    const categoryData = {
      name: nameRef.current.trim(),
      description: descriptionRef.current?.trim() || '',
    };

    setLoading(true);
    
    let result;
    if (isEditMode) {
      result = await updateCategory(categoryId, categoryData);
    } else {
      result = await createCategory(categoryData);
    }
    
    if (result.success) {
      Alert.alert(
        'Thành công',
        isEditMode ? 'Cập nhật danh mục thành công!' : 'Thêm danh mục thành công!',
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
      `Bạn có chắc chắn muốn xóa danh mục "${category?.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            const { deleteCategory } = require('../../services/cateService');
            const result = await deleteCategory(categoryId);
            if (result.success) {
              Alert.alert(
                'Thành công', 
                'Xóa danh mục thành công!',
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
            {isEditMode ? 'Sửa danh mục' : 'Thêm danh mục'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.form}>
            <Text style={styles.label}>Tên danh mục *</Text>
            <MyInput
              icon={<Icon.Tag stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />}
              placeholder="Nhập tên danh mục..."
              defaultValue={category?.name || ''}
              onChangeText={value => nameRef.current = value}
            />

            <Text style={styles.label}>Mô tả</Text>
            <MyInput
              icon={<Icon.FileText stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />}
              placeholder="Nhập mô tả danh mục..."
              defaultValue={category?.description || ''}
              multiline={true}
              numberOfLines={4}
              onChangeText={value => descriptionRef.current = value}
              inputStyle={styles.textArea}
            />

            <MyButton
              title={isEditMode ? 'Cập nhật danh mục' : 'Thêm danh mục'}
              loading={loading}
              onPress={handleSubmit}
              buttonStyle={styles.submitButton}
            />

            {/* Delete Button for Edit Mode */}
            {isEditMode && (
              <MyButton
                title="Xóa danh mục"
                onPress={handleDelete}
                buttonStyle={[styles.submitButton, styles.deleteButton]}
                textStyle={styles.deleteButtonText}
              />
            )}
          </View>
        </View>
      </View>
    </ScreenWrapper>
  );
};

export default detailsCateScr;

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
  form: {
    gap: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: -15,
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
});