import { Pressable, StyleSheet, Text, View, FlatList, ActivityIndicator, Animated, Dimensions } from 'react-native'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../../../context/AuthContext'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import { useRouter } from 'expo-router'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import * as Icon from 'react-native-feather'
import MyAvatar from '../../../components/MyAvatar'
import MyButton from '../../../components/MyButton'
import { getBillStatus, getStatusColor, getStatusText, BILL_STATUS } from '../../../helper/billStatus'
import TimeUtils from '../../../helper/timeUtils'
import DateTimePicker from '@react-native-community/datetimepicker'

import { fetchBill, fetchDetailByBillIds } from '../../../services/billService'
import { fetchTable } from '../../../services/tableService'


const index = () => {
    const { user } = useAuth()
    const router = useRouter()
    const [bills, setBills] = useState([])
    const [filteredBills, setFilteredBills] = useState([])
    const [tables, setTables] = useState([])
    const [details, setDetails] = useState([])
    const [loading, setLoading] = useState(false)
    
    const [showDatePanel, setShowDatePanel] = useState(false)
    const [fromDate, setFromDate] = useState(new Date())
    const [toDate, setToDate] = useState(new Date())
    const [showFromPicker, setShowFromPicker] = useState(false)
    const [showToPicker, setShowToPicker] = useState(false)
    const [dateFilterActive, setDateFilterActive] = useState(false)
    const [pickerMode, setPickerMode] = useState('from') // 'from' | 'to'

    //  Animation values
    const slideAnim = useRef(new Animated.Value(-300)).current
    const fadeAnim = useRef(new Animated.Value(0)).current

    // Filter bills by date range
    const filterBillsByDate = useCallback(() => {
        if (!dateFilterActive) {
            setFilteredBills(bills)
            return
        }

        const filtered = bills.filter(bill => {
            const billDate = new Date(bill.created_at || bill.time)
            const from = new Date(fromDate.setHours(0, 0, 0, 0))
            const to = new Date(toDate.setHours(23, 59, 59, 999))
            
            return billDate >= from && billDate <= to
        })

        setFilteredBills(filtered)
    }, [bills, fromDate, toDate, dateFilterActive])

    useEffect(() => {
        filterBillsByDate()
    }, [filterBillsByDate])

    // animation
    const showDatePanelWithAnimation = () => {
        setShowDatePanel(true)
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start()
    }

    const hideDatePanelWithAnimation = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -300,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowDatePanel(false)
            setShowFromPicker(false)
            setShowToPicker(false)
        })
    }

    // Fetch bills
    const fetchBills = useCallback(async () => {
        try {
            setLoading(true)

            const billsResult = await fetchBill()
            if (!billsResult.success) {
                console.error('Error fetching bills:', billsResult.msg)
                return
            }

            const billsData = billsResult.data
            setBills(billsData)

            const tablesResult = await fetchTable()
            if (tablesResult.success) {
                setTables(tablesResult.data)
            }

            const billIds = billsData.map(bill => bill.id)
            if (billIds.length > 0) {
                const detailsResult = await fetchDetailByBillIds(billIds)
                if (detailsResult.success) {
                    setDetails(detailsResult.data)
                }
            }

        } catch (error) {
            console.error('fetchBills error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchBills()
    }, [])

    // Date picker handlers 
    const onDateChange = (event, selectedDate) => {
        if (event.type === 'dismissed') {
            setShowFromPicker(false)
            setShowToPicker(false)
            return
        }

        if (selectedDate) {
            if (pickerMode === 'from') {
                setFromDate(selectedDate)
                setShowFromPicker(false)
                setTimeout(() => {
                    setPickerMode('to')
                    setShowToPicker(true)
                }, 300)
            } else {
                setToDate(selectedDate)
                setShowToPicker(false)
            }
        }
    }

    const selectFromDate = () => {
        setPickerMode('from')
        setShowToPicker(false)
        setShowFromPicker(true)
    }

    const selectToDate = () => {
        setPickerMode('to')
        setShowFromPicker(false)
        setShowToPicker(true)
    }

    const applyDateFilter = () => {
        setDateFilterActive(true)
        hideDatePanelWithAnimation()
    }

    const clearDateFilter = () => {
        setDateFilterActive(false)
        setFromDate(new Date())
        setToDate(new Date())
        hideDatePanelWithAnimation()
    }

    // ✅ Quick date presets
    const setDatePreset = (days) => {
        const today = new Date()
        const pastDate = new Date()
        pastDate.setDate(today.getDate() - days)
        
        setFromDate(pastDate)
        setToDate(today)
    }

    // ✅ Helper functions
    const getTableName = useCallback((tableId) => {
        const table = tables.find(t => t.id === tableId)
        return table?.name || `Bàn ${tableId}`
    }, [tables])

    const getBillDetails = useCallback((billId) => {
        return details.filter(detail => detail.billId === billId)
    }, [details])

    const handleCancelBill = useCallback(async (billId) => {
        try {
            const { supabase } = await import('../../../lib/supabase')
            const { error } = await supabase
                .from('bills')
                .update({
                    state: 'cancelled',
                    visit: 'un_visited'
                })
                .eq('id', billId)

            if (error) {
                console.error('Cancel bill error:', error)
                return
            }

            fetchBills()
        } catch (error) {
            console.error('handleCancelBill error:', error)
        }
    }, [fetchBills])

    const handleArrived = useCallback(async (billId) => {
        try {
            const { supabase } = await import('../../../lib/supabase')
            const { error } = await supabase
                .from('bills')
                .update({ visit: 'visited' })
                .eq('id', billId)

            if (error) {
                console.error('Mark arrived error:', error)
                return
            }

            fetchBills()
        } catch (error) {
            console.error('handleArrived error:', error)
        }
    }, [fetchBills])

    // ✅ Components
    const BillInfoRow = ({ icon, text, iconColor = '#666', textStyle = {} }) => {
        const IconComponent = Icon[icon]
        return (
            <View style={styles.billInfoRow}>
                {IconComponent && <IconComponent stroke={iconColor} width={16} height={16} />}
                <Text style={[styles.billInfoText, textStyle]}>{text}</Text>
            </View>
        )
    }

    const TablesSection = ({ billId }) => {
        const billDetails = getBillDetails(billId)

        if (billDetails.length === 0) return null

        return (
            <View style={styles.tablesSection}>
                <Text style={styles.tablesSectionTitle}>Bàn đã đặt:</Text>
                <View style={styles.tablesContainer}>
                    {billDetails.map((detail) => (
                        <View key={detail.id} style={styles.tableChip}>
                            <Text style={styles.tableChipText}>
                                {getTableName(detail.tableId)}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        )
    }

    const ActionButtons = ({ item, timeStatus, onCancel, onArrived }) => (
        <View style={styles.actionButtons}>
            <Pressable
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => onCancel(item.id)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
                <Icon.X stroke="white" width={16} height={16} />
                <Text style={styles.actionButtonText}>Hủy</Text>
            </Pressable>

            <Pressable
                style={[styles.actionButton, styles.arrivedButton]}
                onPress={() => onArrived(item.id)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
                <Icon.Check stroke="white" width={16} height={16} />
                <Text style={styles.actionButtonText}>Đã đến</Text>
            </Pressable>
        </View>
    )

    // ✅ Animated Date Panel - Không dùng Modal
    const AnimatedDatePanel = () => {
        if (!showDatePanel) return null

        return (
            <Animated.View 
                style={[
                    styles.datePanel, 
                    {
                        transform: [{ translateY: slideAnim }],
                        opacity: fadeAnim
                    }
                ]}
            >
                <View style={styles.datePanelContent}>
                    <Text style={styles.datePanelTitle}>Chọn khoảng thời gian</Text>
                    
                    {/* Quick Presets */}
                    <View style={styles.presetsContainer}>
                        <Pressable 
                            style={styles.presetButton}
                            onPress={() => setDatePreset(1)}
                            android_ripple={{ color: '#e3f2fd' }}
                        >
                            <Text style={styles.presetText}>Hôm qua</Text>
                        </Pressable>
                        <Pressable 
                            style={styles.presetButton}
                            onPress={() => setDatePreset(7)}
                            android_ripple={{ color: '#e3f2fd' }}
                        >
                            <Text style={styles.presetText}>7 ngày</Text>
                        </Pressable>
                        <Pressable 
                            style={styles.presetButton}
                            onPress={() => setDatePreset(30)}
                            android_ripple={{ color: '#e3f2fd' }}
                        >
                            <Text style={styles.presetText}>30 ngày</Text>
                        </Pressable>
                    </View>

                    {/* Date Selection */}
                    <View style={styles.dateSelectionContainer}>
                        {/* From Date */}
                        <View style={styles.dateInputGroup}>
                            <Text style={styles.dateLabel}>Từ ngày:</Text>
                            <Pressable 
                                style={[
                                    styles.dateDisplayButton,
                                    showFromPicker && styles.dateDisplayButtonActive
                                ]}
                                onPress={selectFromDate}
                                android_ripple={{ color: '#e3f2fd' }}
                            >
                                <Icon.Calendar 
                                    stroke={showFromPicker ? theme.colors.primary : "#666"} 
                                    width={18} 
                                    height={18} 
                                />
                                <Text style={[
                                    styles.dateDisplayText,
                                    showFromPicker && { color: theme.colors.primary }
                                ]}>
                                    {fromDate.toLocaleDateString('vi-VN')}
                                </Text>
                            </Pressable>
                        </View>

                        {/* To Date */}
                        <View style={styles.dateInputGroup}>
                            <Text style={styles.dateLabel}>Đến ngày:</Text>
                            <Pressable 
                                style={[
                                    styles.dateDisplayButton,
                                    showToPicker && styles.dateDisplayButtonActive
                                ]}
                                onPress={selectToDate}
                                android_ripple={{ color: '#e3f2fd' }}
                            >
                                <Icon.Calendar 
                                    stroke={showToPicker ? theme.colors.primary : "#666"} 
                                    width={18} 
                                    height={18} 
                                />
                                <Text style={[
                                    styles.dateDisplayText,
                                    showToPicker && { color: theme.colors.primary }
                                ]}>
                                    {toDate.toLocaleDateString('vi-VN')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.datePanelActions}>
                        <Pressable 
                            style={styles.clearPanelButton}
                            onPress={clearDateFilter}
                            android_ripple={{ color: '#f0f0f0' }}
                        >
                            <Text style={styles.clearPanelButtonText}>Xóa bộ lọc</Text>
                        </Pressable>
                        
                        <Pressable 
                            style={styles.applyPanelButton}
                            onPress={applyDateFilter}
                            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                            <Text style={styles.applyPanelButtonText}>Áp dụng</Text>
                        </Pressable>
                    </View>

                    {/* Close Button */}
                    <Pressable 
                        style={styles.closePanelButton}
                        onPress={hideDatePanelWithAnimation}
                        android_ripple={{ color: '#f0f0f0', radius: 20 }}
                    >
                        <Icon.X stroke="#666" width={24} height={24} />
                    </Pressable>
                </View>

                {/* Native Date Pickers */}
                {showFromPicker && (
                    <DateTimePicker
                        value={fromDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        maximumDate={toDate}
                        minimumDate={new Date(2020, 0, 1)}
                        themeVariant="light"
                    />
                )}

                {showToPicker && (
                    <DateTimePicker
                        value={toDate}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                        minimumDate={fromDate}
                        maximumDate={new Date()}
                        themeVariant="light"
                    />
                )}
            </Animated.View>
        )
    }

    // ✅ Render bill item
    const renderBillItem = useCallback(({ item, index }) => {
        const billStatus = getBillStatus(item.state, item.visit)
        const timeStatus = TimeUtils.calculateTimeStatus(item.time)

        return (
            <View style={styles.billCard}>
                <View style={styles.billHeader}>
                    <View style={styles.billHeaderLeft}>
                        <Text style={styles.billId}>Đơn #{filteredBills.length - index}</Text>
                        <Text style={styles.billPrice}>
                            {item.price ? `${item.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.state, item.visit) }]}>
                        <Text style={styles.statusText}>{getStatusText(item.state, item.visit)}</Text>
                    </View>
                </View>

                <View style={styles.billInfo}>
                    <BillInfoRow icon="User" text={item.name} />
                    <BillInfoRow icon="Phone" text={item.phone} />
                    <BillInfoRow icon="Users" text={`${item.num_people} người`} />
                    <BillInfoRow icon="Clock" text={new Date(item.time).toLocaleString('vi-VN')} />
                    <BillInfoRow
                        icon="DollarSign"
                        text={item.price ? `${item.price.toLocaleString('vi-VN')}đ` : 'Chưa có món ăn'}
                        iconColor={theme.colors.primary}
                        textStyle={styles.priceText}
                    />

                    {billStatus === BILL_STATUS.WAITING && (
                        <BillInfoRow
                            icon="Info"
                            text={timeStatus.text}
                            iconColor={timeStatus.color}
                            textStyle={{ color: timeStatus.color }}
                        />
                    )}

                    {item.note && <BillInfoRow icon="FileText" text={item.note} />}
                </View>

                <TablesSection billId={item.id} />

                {billStatus === BILL_STATUS.WAITING && timeStatus.status !== 'expired' && (
                    <ActionButtons
                        item={item}
                        timeStatus={timeStatus}
                        onCancel={handleCancelBill}
                        onArrived={handleArrived}
                    />
                )}
            </View>
        )
    }, [filteredBills.length, getBillDetails, getTableName, handleCancelBill, handleArrived])

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Bún chả Obama - Admin</Text>
                    <View style={styles.icons}>
                        <Pressable onPress={() => router.push('/main/profileScr')}>
                            <MyAvatar uri={user?.image} />
                        </Pressable>
                    </View>
                </View>
                
                {/* Admin Management Buttons */}
                <View style={styles.adminButtonContainer}>
                    <View style={styles.adminButtonRow}>
                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageUserScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="people" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý tài khoản</Text>
                        </View>

                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageCateScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="category" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý danh mục</Text>
                        </View>

                        <View style={styles.adminButtonItem}>
                            <MyButton
                                onPress={() => router.push('/main/manageProductScr')}
                                buttonStyle={styles.adminButton}
                                icon={<MaterialIcons name="restaurant-menu" size={30} color="black" />}
                            />
                            <Text style={styles.adminButtonText}>Quản lý sản phẩm</Text>
                        </View>
                    </View>
                </View>

                {/* Bills Section */}
                <View style={styles.billsSection}>
                    <View style={styles.billsHeader}>
                        <Text style={styles.billsTitle}>
                            Đơn đặt bàn {dateFilterActive && `(${filteredBills.length})`}
                        </Text>
                        <View style={styles.headerActions}>
                            <Pressable 
                                onPress={showDatePanelWithAnimation} 
                                style={[styles.filterButton, dateFilterActive && styles.filterButtonActive]}
                                android_ripple={{ color: '#e3f2fd' }}
                            >
                                <Icon.Calendar stroke={dateFilterActive ? "white" : "#666"} width={16} height={16} />
                            </Pressable>

                            <Pressable 
                                onPress={fetchBills} 
                                style={styles.refreshButton}
                                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                            >
                                <MaterialIcons name="refresh" size={20} color="white" />
                            </Pressable>
                        </View>
                    </View>

                    {dateFilterActive && (
                        <View style={styles.filterInfo}>
                            <Text style={styles.filterInfoText}>
                                📅 {fromDate.toLocaleDateString('vi-VN')} - {toDate.toLocaleDateString('vi-VN')}
                            </Text>
                            <Pressable onPress={clearDateFilter} style={styles.clearFilterButton}>
                                <Icon.X stroke="#666" width={14} height={14} />
                            </Pressable>
                        </View>
                    )}

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={styles.loadingText}>Đang tải...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={filteredBills}
                            renderItem={renderBillItem}
                            keyExtractor={(item) => item.id.toString()}
                            showsVerticalScrollIndicator={false}
                            style={styles.billsList}
                            ListEmptyComponent={
                                <View style={styles.emptyContainer}>
                                    <Text style={styles.emptyText}>
                                        {dateFilterActive ? 'Không có đơn trong khoảng thời gian này' : 'Chưa có đơn đặt bàn nào'}
                                    </Text>
                                </View>
                            }
                        />
                    )}
                </View>

                {/* Animated Date Panel - Overlay */}
                <AnimatedDatePanel />
            </View>
        </ScreenWrapper>
    )
}

export default index

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        marginHorizontal: wp(4)
    },
    title: {
        fontSize: hp(3.5),
        fontWeight: 'bold',
        color: theme.colors.text
    },
    // Admin Management Styles
    adminButtonContainer: {
        marginHorizontal: wp(4),
        marginTop: 20,
    },
    adminButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    adminButtonItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    adminButton: {
        width: wp(25),
        height: wp(25),
        backgroundColor: 'white',
        borderRadius: 15,
    },
    adminButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 10,
        paddingHorizontal: 2,
    },
    // Bills Section
    billsSection: {
        flex: 1,
        marginTop: hp(3),
        backgroundColor: '#fff7bf',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: hp(2),
        marginHorizontal: wp(2),
    },
    billsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: wp(4),
        marginBottom: hp(2),
    },
    billsTitle: {
        fontSize: hp(2.2),
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        gap: wp(2),
    },
    filterButton: {
        backgroundColor: 'white',
        padding: wp(2.5),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: '#e0e0e0',
        elevation: 2,
    },
    filterButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    refreshButton: {
        backgroundColor: theme.colors.primary,
        padding: wp(2.5),
        borderRadius: wp(2),
        elevation: 2,
    },
    // Filter Info
    filterInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#e8f5e8',
        marginHorizontal: wp(4),
        marginBottom: hp(1),
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        borderRadius: wp(2),
    },
    filterInfoText: {
        fontSize: hp(1.4),
        color: '#2d5016',
        fontWeight: '500',
    },
    clearFilterButton: {
        padding: wp(1),
    },
    // Animated Date Panel Styles
    datePanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-start',
        paddingTop: hp(10),
        zIndex: 1000,
    },
    datePanelContent: {
        backgroundColor: 'white',
        marginHorizontal: wp(4),
        borderRadius: wp(4),
        padding: wp(5),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    datePanelTitle: {
        fontSize: hp(2.2),
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: hp(2),
        color: theme.colors.text,
    },
    // Quick Presets
    presetsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: hp(2.5),
        gap: wp(2),
    },
    presetButton: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingVertical: hp(1),
        paddingHorizontal: wp(2),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: '#e9ecef',
        alignItems: 'center',
    },
    presetText: {
        fontSize: hp(1.4),
        color: '#495057',
        fontWeight: '500',
    },
    // Date Selection
    dateSelectionContainer: {
        gap: hp(1.5),
        marginBottom: hp(2.5),
    },
    dateInputGroup: {
        gap: hp(0.8),
    },
    dateLabel: {
        fontSize: hp(1.6),
        fontWeight: '600',
        color: '#333',
    },
    dateDisplayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: wp(3.5),
        borderRadius: wp(2.5),
        borderWidth: 1.5,
        borderColor: '#e9ecef',
        gap: wp(2.5),
        minHeight: hp(5.5),
    },
    dateDisplayButtonActive: {
        borderColor: theme.colors.primary,
        backgroundColor: '#f0f8ff',
    },
    dateDisplayText: {
        fontSize: hp(1.6),
        color: '#333',
        fontWeight: '500',
    },
    // Panel Actions
    datePanelActions: {
        flexDirection: 'row',
        gap: wp(3),
    },
    clearPanelButton: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e9ecef',
        paddingVertical: hp(1.5),
        borderRadius: wp(2.5),
        alignItems: 'center',
    },
    clearPanelButtonText: {
        color: '#666',
        fontSize: hp(1.6),
        fontWeight: '600',
    },
    applyPanelButton: {
        flex: 1,
        backgroundColor: theme.colors.primary,
        paddingVertical: hp(1.5),
        borderRadius: wp(2.5),
        alignItems: 'center',
    },
    applyPanelButtonText: {
        color: 'white',
        fontSize: hp(1.6),
        fontWeight: '600',
    },
    closePanelButton: {
        position: 'absolute',
        top: wp(3),
        right: wp(3),
        padding: wp(1.5),
        borderRadius: wp(4),
    },
    // Bills List
    billsList: {
        flex: 1,
        paddingHorizontal: wp(4),
    },
    billCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: wp(4),
        marginBottom: hp(2),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    billHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1.5),
    },
    billHeaderLeft: {
        flex: 1,
    },
    billId: {
        fontSize: hp(1.8),
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    billPrice: {
        fontSize: hp(1.6),
        color: theme.colors.primary,
        fontWeight: '600',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.5),
        borderRadius: wp(2),
    },
    statusText: {
        color: 'white',
        fontSize: hp(1.3),
        fontWeight: '600',
    },
    billInfo: {
        gap: hp(0.8),
    },
    billInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    billInfoText: {
        fontSize: hp(1.5),
        color: '#666',
        flex: 1,
    },
    priceText: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    tablesSection: {
        marginTop: hp(1.5),
        paddingTop: hp(1.5),
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    tablesSectionTitle: {
        fontSize: hp(1.4),
        fontWeight: '600',
        color: '#666',
        marginBottom: hp(0.8),
    },
    tablesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(2),
    },
    tableChip: {
        backgroundColor: '#f8f9fa',
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.5),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    tableChipText: {
        fontSize: hp(1.3),
        color: '#495057',
        fontWeight: '500',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: wp(3),
        marginTop: hp(1.5),
        paddingTop: hp(1.5),
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: hp(1.2),
        borderRadius: wp(2),
        gap: wp(1),
        elevation: 2,
    },
    cancelButton: {
        backgroundColor: '#e74c3c',
    },
    arrivedButton: {
        backgroundColor: '#27ae60',
    },
    actionButtonText: {
        color: 'white',
        fontSize: hp(1.4),
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: hp(5),
    },
    loadingText: {
        marginTop: hp(1),
        fontSize: hp(1.6),
        color: '#666',
    },
    emptyContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: hp(5),
    },
    emptyText: {
        fontSize: hp(1.8),
        color: '#666',
        textAlign: 'center',
    },
})