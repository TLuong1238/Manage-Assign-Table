import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import MyButton from '../../components/MyButton'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { getUserById, updateUser, createUser, deleteUser, checkEmailExists } from '../../services/userService'
import { getUserImageSrc } from '../../services/imageService'
import * as ImagePicker from 'expo-image-picker'

const detailsUserScr = () => {
  const router = useRouter();
  const { userId, mode } = useLocalSearchParams();
  
  // Refs để lưu giá trị input
  const nameRef = useRef('');
  const emailRef = useRef('');
  const phoneRef = useRef('');
  const addressRef = useRef('');
  const bioRef = useRef('');
  
  // States
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('user');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  
  // Form data để hiển thị giá trị trong TextInput
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    bio: ''
  });

  const isEditMode = mode === 'edit';
  const isAddMode = mode === 'add';

  const roleOptions = [
    { value: 'admin', label: 'Admin' },
    { value: 'user', label: 'Người dùng' }
  ];

  // Load dữ liệu user khi edit
  useEffect(() => {
    if (isEditMode && userId) {
      loadUserData();
    }
  }, [userId, isEditMode]);

  const loadUserData = async () => {
    setInitialLoading(true);
    try {
      const result = await getUserById(userId);
      if (result.success) {
        const userData = result.data;
        setUser(userData);
        
        // Set form values
        const values = {
          name: userData.name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
          bio: userData.bio || ''
        };
        setFormValues(values);
        
        // Set refs
        nameRef.current = values.name;
        emailRef.current = values.email;
        phoneRef.current = values.phone;
        addressRef.current = values.address;
        bioRef.current = values.bio;
        
        setSelectedRole(userData.role || 'user');
        setSelectedImage(userData.image);
      } else {
        Alert.alert('Lỗi', result.msg);
        router.back();
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể tải thông tin user');
      router.back();
    }
    setInitialLoading(false);
  };

  // Cập nhật giá trị form
  const updateFormValue = (field, value) => {
    setFormValues(prev => ({ ...prev, [field]: value }));
    
    // Cập nhật ref tương ứng
    switch (field) {
      case 'name':
        nameRef.current = value;
        break;
      case 'email':
        emailRef.current = value;
        break;
      case 'phone':
        phoneRef.current = value;
        break;
      case 'address':
        addressRef.current = value;
        break;
      case 'bio':
        bioRef.current = value;
        break;
    }
  };

  // Chọn ảnh từ thư viện
  const pickImageFromLibrary = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần quyền truy cập thư viện ảnh!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện');
    }
  };

  // Chụp ảnh bằng camera
  const takePhotoWithCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Thông báo', 'Cần quyền truy cập camera!');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  // Hiển thị menu chọn ảnh
  const showImageOptions = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thư viện', onPress: pickImageFromLibrary },
        { text: 'Chụp ảnh', onPress: takePhotoWithCamera },
      ]
    );
  };

  // Xóa ảnh
  const removeSelectedImage = () => {
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

  // Lấy source ảnh để hiển thị
  const getImageSource = () => {
    if (!selectedImage) {
      return getUserImageSrc(null); // Default image
    }
    
    // Ảnh local vừa chọn
    if (selectedImage.startsWith('file://')) {
      return { uri: selectedImage };
    }
    
    // Ảnh từ server
    return getUserImageSrc(selectedImage);
  };

  // Validate dữ liệu
  const validateForm = () => {
    if (!nameRef.current?.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên!');
      return false;
    }

    if (!emailRef.current?.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập email!');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailRef.current.trim())) {
      Alert.alert('Thông báo', 'Email không hợp lệ!');
      return false;
    }

    return true;
  };

  // Xử lý submit form
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Kiểm tra email trùng lặp
      const emailCheck = await checkEmailExists(
        emailRef.current.trim(), 
        isEditMode ? userId : null
      );
      
      if (emailCheck.success && emailCheck.exists) {
        Alert.alert('Thông báo', 'Email đã tồn tại!');
        setLoading(false);
        return;
      }

      // Chuẩn bị dữ liệu
      const userData = {
        name: nameRef.current.trim(),
        email: emailRef.current.trim(),
        phone: phoneRef.current?.trim() || '',
        address: addressRef.current?.trim() || '',
        bio: bioRef.current?.trim() || '',
        role: selectedRole,
        image: selectedImage,
      };

      // Gọi API
      let result;
      if (isEditMode) {
        result = await updateUser(userId, userData);
      } else {
        result = await createUser(userData);
      }

      if (result.success) {
        Alert.alert(
          'Thành công',
          isEditMode ? 'Cập nhật tài khoản thành công!' : 'Thêm tài khoản thành công!',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      } else {
        Alert.alert('Lỗi', result.msg);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Có lỗi xảy ra, vui lòng thử lại!');
    }
    setLoading(false);
  };

  // Xóa tài khoản
  const handleDeleteUser = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa tài khoản "${user?.name}"?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const result = await deleteUser(userId);
              if (result.success) {
                Alert.alert(
                  'Thành công',
                  'Xóa tài khoản thành công!',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              } else {
                Alert.alert('Lỗi', result.msg);
              }
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa tài khoản');
            }
            setLoading(false);
          }
        }
      ]
    );
  };

  // Hiển thị loading
  if (initialLoading) {
    return (
      <ScreenWrapper bg={'#FFBF00'}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
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
            {isEditMode ? 'Sửa tài khoản' : 'Thêm tài khoản'}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Form Container */}
        <View style={styles.formContainer}>
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <Text style={styles.sectionTitle}>Ảnh đại diện</Text>
              <View style={styles.avatarWrapper}>
                <Pressable style={styles.avatarContainer} onPress={showImageOptions}>
                  <Image 
                    source={getImageSource()} 
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                  <View style={styles.avatarOverlay}>
                    <MaterialIcons name="camera-alt" size={24} color="white" />
                  </View>
                </Pressable>
                
                {selectedImage && (
                  <Pressable style={styles.removeImageButton} onPress={removeSelectedImage}>
                    <MaterialIcons name="close" size={18} color="white" />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Form Fields */}
            <View style={styles.formFields}>
              {/* Tên */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tên *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tên..."
                  placeholderTextColor={theme.colors.textLight}
                  value={formValues.name}
                  onChangeText={(value) => updateFormValue('name', value)}
                />
              </View>

              {/* Email */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập email..."
                  placeholderTextColor={theme.colors.textLight}
                  value={formValues.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={(value) => updateFormValue('email', value)}
                />
              </View>

              {/* Số điện thoại */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Số điện thoại</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập số điện thoại..."
                  placeholderTextColor={theme.colors.textLight}
                  value={formValues.phone}
                  keyboardType="phone-pad"
                  onChangeText={(value) => updateFormValue('phone', value)}
                />
              </View>

              {/* Địa chỉ */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Địa chỉ</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập địa chỉ..."
                  placeholderTextColor={theme.colors.textLight}
                  value={formValues.address}
                  onChangeText={(value) => updateFormValue('address', value)}
                />
              </View>

              {/* Tiểu sử */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tiểu sử</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Nhập tiểu sử..."
                  placeholderTextColor={theme.colors.textLight}
                  value={formValues.bio}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  onChangeText={(value) => updateFormValue('bio', value)}
                />
              </View>

              {/* Vai trò */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Vai trò</Text>
                <Pressable style={styles.roleSelector} onPress={() => setShowRoleModal(true)}>
                  <MaterialIcons name="admin-panel-settings" size={20} color={theme.colors.dark} />
                  <Text style={styles.roleSelectorText}>
                    {roleOptions.find(opt => opt.value === selectedRole)?.label}
                  </Text>
                  <MaterialIcons name="keyboard-arrow-down" size={24} color={theme.colors.dark} />
                </Pressable>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <MyButton
                title={isEditMode ? 'Cập nhật tài khoản' : 'Thêm tài khoản'}
                loading={loading}
                onPress={handleSubmit}
                buttonStyle={styles.submitButton}
              />

              {isEditMode && (
                <MyButton
                  title="Xóa tài khoản"
                  onPress={handleDeleteUser}
                  buttonStyle={[styles.submitButton, styles.deleteButton]}
                  textStyle={styles.deleteButtonText}
                />
              )}
            </View>
          </ScrollView>
        </View>

        {/* Role Selection Modal */}
        <Modal
          visible={showRoleModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRoleModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Chọn vai trò</Text>
                <Pressable onPress={() => setShowRoleModal(false)}>
                  <MaterialIcons name="close" size={24} color={theme.colors.dark} />
                </Pressable>
              </View>
              
              <View style={styles.modalList}>
                {roleOptions.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.roleOption,
                      selectedRole === option.value && styles.selectedRoleOption
                    ]}
                    onPress={() => {
                      setSelectedRole(option.value);
                      setShowRoleModal(false);
                    }}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      selectedRole === option.value && styles.selectedRoleOptionText
                    ]}>
                      {option.label}
                    </Text>
                    {selectedRole === option.value && (
                      <MaterialIcons name="check" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

export default detailsUserScr;

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
  headerSpacer: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 15,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  formFields: {
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.text,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  roleSelectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  actionButtons: {
    marginTop: 30,
    gap: 15,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#ff4757',
  },
  deleteButtonText: {
    color: 'white',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
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
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  selectedRoleOption: {
    backgroundColor: '#f0f8ff',
  },
  roleOptionText: {
    fontSize: 16,
    color: theme.colors.text,
  },
  selectedRoleOptionText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});