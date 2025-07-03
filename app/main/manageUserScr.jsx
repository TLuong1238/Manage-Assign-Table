import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View, Modal, TouchableOpacity } from 'react-native'
import React, { useEffect, useState } from 'react'
import ScreenWrapper from '../../components/ScreenWrapper'
import { hp, wp } from '../../helper/common'
import { theme } from '../../constants/theme'
import MyBackButton from '../../components/MyBackButton'
import * as Icon from 'react-native-feather'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import { fetchUsers, searchUsers, deleteUser, updateRole } from '../../services/userService'
import { useDebounce } from '../../hook/useDebounce'
import { getUserImageSrc } from '../../services/imageService'

const manageUserScr = () => {
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    // Sử dụng debounce với delay 500ms
    const debouncedSearchText = useDebounce(searchText, 500);

    // Lấy danh sách tài khoản
    const getUsers = async () => {
        setLoading(true);
        const result = await fetchUsers();
        if (result.success) {
            setUsers(result.data);
        } else {
            Alert.alert('Lỗi', result.msg);
        }
        setLoading(false);
    };

    // Tìm kiếm tài khoản với debounce
    const performSearch = async (searchTerm) => {
        if (searchTerm.trim() === '') {
            await getUsers();
            return;
        }

        setLoading(true);
        const result = await searchUsers(searchTerm.trim());
        if (result.success) {
            setUsers(result.data);
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
        getUsers();
    }, []);

    // Xử lý thay đổi text search
    const handleSearchTextChange = (text) => {
        setSearchText(text);
    };

    // Xóa tài khoản
    const handleDeleteUser = (user) => {
        Alert.alert(
            'Xác nhận xóa',
            `Bạn có chắc chắn muốn xóa tài khoản "${user.name}"?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        const result = await deleteUser(user.id);
                        if (result.success) {
                            Alert.alert('Thành công', 'Xóa tài khoản thành công!');
                            getUsers();
                        } else {
                            Alert.alert('Lỗi', result.msg);
                        }
                        setLoading(false);
                    }
                }
            ]
        );
    };

    // Sửa tài khoản
    const handleEditUser = (user) => {
        router.push({
            pathname: '/main/detailsUserScr',
            params: {
                userId: user.id,
                mode: 'edit'
            }
        });
    };

    // Thêm tài khoản mới
    const handleAddUser = () => {
        router.push({
            pathname: '/main/detailsUserScr',
            params: { mode: 'add' }
        });
    };

    // Refresh danh sách
    const onRefresh = async () => {
        setRefreshing(true);
        setSearchText(''); // Clear search khi refresh
        await getUsers();
        setRefreshing(false);
    };

    // Xử lý thay đổi role
    const handleChangeRole = (user) => {
        setSelectedUser(user);
        setShowRoleModal(true);
    };

    const updateUserRole = async (newRole) => {
        if (!selectedUser) return;
        
        try {
            setLoading(true);
            const result = await updateRole(selectedUser.id, newRole);
            
            if (result.success) {
                Alert.alert('Thành công', `Đã cập nhật quyền thành ${newRole}`);
                await getUsers(); // Refresh danh sách
            } else {
                Alert.alert('Lỗi', result.msg);
            }
        } catch (error) {
            Alert.alert('Lỗi', 'Không thể cập nhật quyền');
        } finally {
            setLoading(false);
            setShowRoleModal(false);
            setSelectedUser(null);
        }
    };

    // Render role badge
    const renderRoleBadge = (role) => {
        const roleConfig = {
            admin: { color: '#e74c3c', text: 'Admin' },
            vip: { color: '#f39c12', text: 'Khách hàng thân thiết' },
            user: { color: '#27ae60', text: 'Người dùng' }
        };

        const config = roleConfig[role] || roleConfig.user;

        return (
            <View style={[styles.roleBadge, { backgroundColor: config.color }]}>
                <Text style={styles.roleText}>{config.text}</Text>
            </View>
        );
    };

    // Render status badge
    const renderStatusBadge = (status) => {
        const statusConfig = {
            active: { color: '#27ae60', text: 'Hoạt động' },
            inactive: { color: '#e74c3c', text: 'Bị khóa' },
            pending: { color: '#f39c12', text: 'Chờ duyệt' }
        };

        const config = statusConfig[status] || statusConfig.active;

        return (
            <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
                <Text style={styles.statusText}>{config.text}</Text>
            </View>
        );
    };

    // Render item tài khoản
    const renderUserItem = ({ item }) => {
        const imageSource = getUserImageSrc(item.image);

        return (
            <Pressable
                style={styles.userItem}
                onPress={() => handleEditUser(item)}
            >
                <View style={styles.userImageContainer}>
                    <Image
                        source={imageSource}
                        style={styles.userImage}
                        resizeMode="cover"
                        onError={(error) => {
                            console.error('Image load error:', error);
                        }}
                    />
                </View>

                <View style={styles.userInfo}>
                    <Text style={styles.userName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.userEmail} numberOfLines={1}>{item.email}</Text>
                    <Text style={styles.userPhone}>
                        SĐT: {item.phone || 'Chưa có'}
                    </Text>
                    <Text style={styles.userAddress} numberOfLines={1}>
                        Địa chỉ: {item.address || 'Chưa có'}
                    </Text>
                    <View style={styles.badgeContainer}>
                        {renderRoleBadge(item.role)}
                    </View>
                    <Text style={styles.userDate}>
                        Tạo: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                    </Text>
                </View>

                <View style={styles.actionButtons}>
                    <Pressable
                        style={styles.roleButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleChangeRole(item);
                        }}
                    >
                        <MaterialIcons name="admin-panel-settings" size={24} color="#3498db" />
                    </Pressable>
                    
                    <Pressable
                        style={styles.deleteButton}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteUser(item);
                        }}
                    >
                        <MaterialIcons name="delete" size={24} color="#ff4757" />
                    </Pressable>
                </View>
            </Pressable>
        );
    };

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <MyBackButton />
                    <Text style={styles.title}>Quản lý tài khoản</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Icon.Search stroke={theme.colors.dark} strokeWidth={2} width={20} height={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm kiếm tài khoản..."
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

                {/* Users List */}
                <View style={styles.listContainer}>
                    <FlatList
                        data={users}
                        renderItem={renderUserItem}
                        keyExtractor={(item) => item.id.toString()}
                        showsVerticalScrollIndicator={false}
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="people" size={60} color={theme.colors.textLight} />
                                <Text style={styles.emptyText}>
                                    {loading ? 'Đang tải...' : 'Chưa có tài khoản nào'}
                                </Text>
                                <Text style={styles.emptySubText}>
                                    Nhấn nút + để thêm tài khoản mới
                                </Text>
                            </View>
                        }
                    />
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
                                <Text style={styles.modalTitle}>Chọn quyền cho {selectedUser?.name}</Text>
                                <Pressable onPress={() => setShowRoleModal(false)}>
                                    <MaterialIcons name="close" size={24} color={theme.colors.dark} />
                                </Pressable>
                            </View>

                            <View style={styles.roleOptions}>
                                {[
                                    { value: 'user', label: 'Người dùng', color: '#27ae60' },
                                    { value: 'vip', label: 'Khách hàng thân thiết', color: '#f39c12' },
                                    { value: 'admin', label: 'Admin', color: '#e74c3c' }
                                ].map((role) => (
                                    <TouchableOpacity
                                        key={role.value}
                                        style={[
                                            styles.roleOption,
                                            selectedUser?.role === role.value && styles.selectedRoleOption
                                        ]}
                                        onPress={() => updateUserRole(role.value)}
                                    >
                                        <View style={[styles.roleIndicator, { backgroundColor: role.color }]} />
                                        <Text style={[
                                            styles.roleOptionText,
                                            selectedUser?.role === role.value && styles.selectedRoleOptionText
                                        ]}>
                                            {role.label}
                                        </Text>
                                        {selectedUser?.role === role.value && (
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
                    onPress={handleAddUser}
                >
                    <MaterialIcons name="add" size={30} color="white" />
                </Pressable>
            </View>
        </ScreenWrapper>
    );
};

export default manageUserScr;

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
    userItem: {
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
    userImageContainer: {
        marginRight: 15,
    },
    userImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    placeholderImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e9ecef',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
        marginRight: 10,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 3,
    },
    userUsername: {
        fontSize: 14,
        color: theme.colors.primary,
        marginBottom: 3,
        fontWeight: '600',
    },
    userEmail: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 3,
    },
    userPhone: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 8,
    },
    badgeContainer: {
        flexDirection: 'row',
        gap: 5,
        marginBottom: 5,
    },
    roleBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    roleText: {
        fontSize: 10,
        color: 'white',
        fontWeight: '600',
    },
    userAddress: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 8,
    },
    userDate: {
        fontSize: 11,
        color: theme.colors.textLight,
    },
    actionButtons: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    roleButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    deleteButton: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
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
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 0,
        width: wp(85),
        maxHeight: hp(60),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    },
    roleOptions: {
        padding: 20,
    },
    roleOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: '#f8f9fa',
    },
    selectedRoleOption: {
        backgroundColor: '#e3f2fd',
        borderWidth: 1,
        borderColor: theme.colors.primary,
    },
    roleIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 12,
    },
    roleOptionText: {
        fontSize: 16,
        color: theme.colors.text,
        flex: 1,
    },
    selectedRoleOptionText: {
        fontWeight: '600',
        color: theme.colors.primary,
    },
});