import {
    Alert,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
    RefreshControl,
    Modal,
    ScrollView
} from 'react-native'
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import MyTableItem from '../../../components/MyTableItem'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
    getAllFloors,
    getTablesWithBillStatus,
    checkinCustomer,
    checkoutCustomer,
    cancelReservation
} from '../../../services/tableService'
import { supabase } from '../../../lib/supabase'
import PagerView from 'react-native-pager-view'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ===================
// CONSTANTS & BUSINESS RULES
// ===================
const BILL_STATE = {
    IN_ORDER: 'in_order',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

const VISIT_STATUS = {
    UN_VISITED: 'un_visited',
    ON_PROCESS: 'on_process',
    VISITED: 'visited'
};

const TABLE_STATUS = {
    EMPTY: 'empty',
    RESERVED: 'reserved',       // in_order + on_process
    OCCUPIED: 'occupied'        // in_order + visited
};

const BUSINESS_RULES = {
    autoCheckIntervalMs: 30000,           // 30s auto-check
    reservationShowMinutes: 35,           // time before reservation
    autoCheckoutAfterMinutes: 40,         // time after reservation
    statusUpdateDelay: 5000,
    errorStatusDelay: 3000
};

const TABLE_STATUS_CONFIG = {
    [TABLE_STATUS.EMPTY]: {
        text: 'Trống',
        color: '#2ed573',
        bgColor: '#f0fff4',
        icon: 'restaurant',
        priority: 1
    },
    [TABLE_STATUS.RESERVED]: {
        text: 'Đã đặt',
        color: '#ffa502',
        bgColor: '#fff8f0',
        icon: 'schedule',
        priority: 2
    },
    [TABLE_STATUS.OCCUPIED]: {
        text: 'Có khách',
        color: '#ff4757',
        bgColor: '#fff0f0',
        icon: 'people',
        priority: 3
    }
};

// ===================
// CORE BUSINESS LOGIC
// ===================
const getTableStatusFromBill = (bill, referenceTime) => {
    if (!bill) return TABLE_STATUS.EMPTY;

    const billTime = new Date(bill.time);
    const minutesDiff = Math.floor((referenceTime.getTime() - billTime.getTime()) / 60000);

    console.log(`🔍 Table ${bill.tableid || 'unknown'}: Bill time=${billTime.toLocaleString('vi-VN')}, Reference time=${referenceTime.toLocaleString('vi-VN')}, minutesDiff=${minutesDiff}`);

    // Logic mapping 
    if (bill.state === BILL_STATE.IN_ORDER) {
        if (bill.visit === VISIT_STATUS.ON_PROCESS) {
            // in_order + on_process = RESERVED 
            // show reservation in range
            if (minutesDiff >= -BUSINESS_RULES.reservationShowMinutes &&
                minutesDiff <= BUSINESS_RULES.autoCheckoutAfterMinutes) {
                console.log(`RESERVED: minutesDiff=${minutesDiff} trong khoảng [-${BUSINESS_RULES.reservationShowMinutes}, ${BUSINESS_RULES.autoCheckoutAfterMinutes}]`);
                return TABLE_STATUS.RESERVED;
            } else {
                console.log(`EMPTY: minutesDiff=${minutesDiff} ngoài khoảng cho phép`);
                return TABLE_STATUS.EMPTY;
            }
        }
        else if (bill.visit === VISIT_STATUS.VISITED) {
            return TABLE_STATUS.OCCUPIED;
        }
    }

    // completed/cancelled = empty
    return TABLE_STATUS.EMPTY;
};

// ===================
// MAIN COMPONENT
// ===================
const manageTableScr = () => {
    const router = useRouter();
    const pagerRef = useRef(null);
    const autoCheckIntervalRef = useRef(null);
    const channelRef = useRef(null);
    const isUnmountedRef = useRef(false);
    const liveTimeIntervalRef = useRef(null); // THÊM MỚI

    // ===================
    // STATES
    // ===================
    const [state, setState] = useState({
        // App state
        floors: [],
        tables: [],
        currentFloor: 0,
        selectedTable: null,
        loading: true,
        refreshing: false,

        // Time state
        selectedDateTime: new Date(),
        showDatePicker: false,
        showTimePicker: false,
        isLiveMode: true,
        currentLiveTime: new Date(), // THÊM MỚI

        // Auto-check state
        lastCheck: new Date(),
        autoCheckStatus: '',
        businessFixes: 0
    });

    // ===================
    // COMPUTED VALUES
    // ===================
    const currentReferenceTime = useMemo(() =>
        state.isLiveMode ? new Date() : state.selectedDateTime
        , [state.isLiveMode, state.selectedDateTime]);

    const formattedDateTime = useMemo(() => {
        if (state.isLiveMode) return 'Thời gian thực';
        return currentReferenceTime.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }, [state.isLiveMode, currentReferenceTime]);

    const tableStats = useMemo(() => {
        const stats = {
            [TABLE_STATUS.OCCUPIED]: 0,
            [TABLE_STATUS.RESERVED]: 0,
            [TABLE_STATUS.EMPTY]: 0,
            total: state.tables.length
        };
        state.tables.forEach(table => {
            if (table.status) {
                stats[table.status]++;
            }
        });
        return stats;
    }, [state.tables]);

    const tablesByFloor = useMemo(() => {
        const floors = {};
        state.tables.forEach(table => {
            if (!floors[table.floor]) floors[table.floor] = [];
            floors[table.floor].push(table);
        });

        Object.keys(floors).forEach(floor => {
            floors[floor].sort((a, b) => a.id - b.id);
        });

        return floors;
    }, [state.tables]);

    const formatLastCheck = useMemo(() => {
        const diff = Math.floor((new Date() - state.lastCheck) / 1000);
        return diff < 60 ? `${diff}s` : `${Math.floor(diff / 60)}m`;
    }, [state.lastCheck]);

    // ===================
    // STATE UPDATER
    // ===================
    const updateState = useCallback((updates) => {
        if (!isUnmountedRef.current) {
            setState(prev => ({ ...prev, ...updates }));
        }
    }, []);

    // ===================
    // LIVE TIME UPDATE - THÊM MỚI
    // ===================
    const startLiveTimeUpdate = useCallback(() => {
        if (liveTimeIntervalRef.current) return;

        updateState({ currentLiveTime: new Date() });

        liveTimeIntervalRef.current = setInterval(() => {
            if (!isUnmountedRef.current && state.isLiveMode) {
                updateState({ currentLiveTime: new Date() });
            }
        }, 1000);
    }, [state.isLiveMode, updateState]);

    const stopLiveTimeUpdate = useCallback(() => {
        if (liveTimeIntervalRef.current) {
            clearInterval(liveTimeIntervalRef.current);
            liveTimeIntervalRef.current = null;
        }
    }, []);

    // ===================
    // DATA OPERATIONS
    // ===================
    const refreshTableData = useCallback(async () => {
        if (isUnmountedRef.current) return false;

        try {
            const result = await getTablesWithBillStatus();
            if (!result.success) throw new Error(result.msg);

            console.log('🔄 Refreshing tables at:', currentReferenceTime.toLocaleString('vi-VN'));

            const updatedTables = result.data.map(table => {
                const newStatus = getTableStatusFromBill(table.bill, currentReferenceTime);

                if (table.bill) {
                    const billTime = new Date(table.bill.time);
                    const minutesDiff = Math.floor((currentReferenceTime.getTime() - billTime.getTime()) / 60000);
                    console.log(`📊 Table ${table.id}: ${table.bill.state} + ${table.bill.visit} = ${newStatus} (${minutesDiff}m)`);
                }

                return { ...table, status: newStatus };
            });

            updateState({ tables: updatedTables });
            return true;
        } catch (error) {
            console.error('Refresh error:', error);
            return false;
        }
    }, [currentReferenceTime, updateState]);

    const loadInitialData = useCallback(async () => {
        if (isUnmountedRef.current) return;

        updateState({ loading: true });

        try {
            const [floorsResult, tablesSuccess] = await Promise.all([
                getAllFloors(),
                refreshTableData()
            ]);

            if (floorsResult.success) {
                updateState({ floors: floorsResult.data });
            }

            if (!tablesSuccess) {
                Alert.alert('Lỗi', 'Không thể tải dữ liệu bàn');
            }
        } catch (error) {
            console.error('Load error:', error);
            Alert.alert('Lỗi', 'Không thể tải dữ liệu');
        }

        updateState({ loading: false });
    }, [refreshTableData, updateState]);

    // ===================
    // AUTO-CHECK SYSTEM
    // ===================
    const applyDatabaseUpdates = useCallback(async (updates) => {
        let successCount = 0;

        for (const update of updates) {
            if (isUnmountedRef.current) break;

            try {
                const { error } = await supabase
                    .from('bills')
                    .update({
                        state: update.newState,
                        visit: update.newVisit
                    })
                    .eq('id', update.id);

                if (!error) {
                    successCount++;
                    console.log(`${update.type}: Bill ${update.id} - ${update.reason}`);
                }
            } catch (error) {
                console.error(`Update error ${update.id}:`, error);
            }
        }

        return successCount;
    }, []);

    const performBusinessLogicChecks = useCallback(async (bills, referenceTime) => {
        const updates = [];

        for (const bill of bills) {
            if (bill.state !== BILL_STATE.IN_ORDER) continue;

            const billTime = new Date(bill.time);
            const minutesDiff = Math.floor((referenceTime.getTime() - billTime.getTime()) / 60000);

            // Auto-checkout: Sau 40p từ thời gian đặt (cho khách đang ngồi)
            if (bill.visit === VISIT_STATUS.VISITED &&
                minutesDiff > BUSINESS_RULES.autoCheckoutAfterMinutes) {
                updates.push({
                    id: bill.id,
                    newState: BILL_STATE.COMPLETED,
                    newVisit: VISIT_STATUS.VISITED,
                    reason: `Auto-checkout after ${BUSINESS_RULES.autoCheckoutAfterMinutes}m`,
                    type: 'auto-checkout'
                });
            }
            // Timeout đặt bàn: Quá 40p không check-in
            else if (bill.visit === VISIT_STATUS.ON_PROCESS &&
                minutesDiff > BUSINESS_RULES.autoCheckoutAfterMinutes) {
                updates.push({
                    id: bill.id,
                    newState: BILL_STATE.CANCELLED,
                    newVisit: VISIT_STATUS.UN_VISITED,
                    reason: `Reservation timeout after ${BUSINESS_RULES.autoCheckoutAfterMinutes}m`,
                    type: 'reservation-timeout'
                });
            }
        }

        return await applyDatabaseUpdates(updates);
    }, [applyDatabaseUpdates]);

    const performAutoCheck = useCallback(async () => {
        if (isUnmountedRef.current) return;

        try {
            updateState({ autoCheckStatus: 'Kiểm tra...' });

            const { data: allBills, error } = await supabase
                .from('bills')
                .select('*');

            if (error) throw new Error('Failed to fetch bills');

            const businessFixes = await performBusinessLogicChecks(allBills, new Date());

            if (!isUnmountedRef.current) {
                await refreshTableData();

                const statusText = businessFixes > 0 ? `✓ ${businessFixes} cập nhật` : '✓ Hoạt động';
                updateState({
                    businessFixes,
                    autoCheckStatus: statusText
                });

                setTimeout(() => {
                    if (!isUnmountedRef.current) {
                        updateState({ autoCheckStatus: '' });
                    }
                }, BUSINESS_RULES.statusUpdateDelay);
            }

        } catch (error) {
            console.error('Auto-check error:', error);
            if (!isUnmountedRef.current) {
                updateState({ autoCheckStatus: '✗ Lỗi' });
                setTimeout(() => {
                    if (!isUnmountedRef.current) {
                        updateState({ autoCheckStatus: '' });
                    }
                }, BUSINESS_RULES.errorStatusDelay);
            }
        }
    }, [performBusinessLogicChecks, refreshTableData, updateState]);

    const startAutoCheck = useCallback(() => {
        if (!state.isLiveMode || autoCheckIntervalRef.current || isUnmountedRef.current) return;

        console.log('🤖 Starting auto-check system');

        // Chạy ngay lần đầu
        updateState({ lastCheck: new Date() });
        performAutoCheck();

        // Setup interval
        autoCheckIntervalRef.current = setInterval(async () => {
            if (isUnmountedRef.current) {
                clearInterval(autoCheckIntervalRef.current);
                autoCheckIntervalRef.current = null;
                return;
            }

            if (state.isLiveMode) {
                console.log('🔄 Auto-check tick at:', new Date().toLocaleTimeString());
                updateState({ lastCheck: new Date() });
                await performAutoCheck();
            } else {
                console.log('Auto-check stopped - not in live mode');
                clearInterval(autoCheckIntervalRef.current);
                autoCheckIntervalRef.current = null;
            }
        }, BUSINESS_RULES.autoCheckIntervalMs);
    }, [state.isLiveMode, performAutoCheck, updateState]);

    const stopAutoCheck = useCallback(() => {
        if (autoCheckIntervalRef.current) {
            clearInterval(autoCheckIntervalRef.current);
            autoCheckIntervalRef.current = null;
            console.log('Auto-check stopped');
        }
    }, []);

    // ===================
    // EVENT HANDLERS
    // ===================
    const handleDateTimeChange = useCallback((type, value) => {
        if (type === 'date') {
            updateState({ showDatePicker: false });
            if (value) {
                const newDateTime = new Date(state.selectedDateTime);
                newDateTime.setFullYear(value.getFullYear(), value.getMonth(), value.getDate());
                updateState({ selectedDateTime: newDateTime });
            }
        } else if (type === 'time') {
            updateState({ showTimePicker: false });
            if (value) {
                const newDateTime = new Date(state.selectedDateTime);
                newDateTime.setHours(value.getHours(), value.getMinutes(), 0, 0);
                updateState({ selectedDateTime: newDateTime });
            }
        }
    }, [state.selectedDateTime, updateState]);

    const toggleLiveMode = useCallback(() => {
        const newIsLiveMode = !state.isLiveMode;
        console.log('🔄 Toggling live mode:', state.isLiveMode, '→', newIsLiveMode);

        updateState({
            isLiveMode: newIsLiveMode,
            selectedDateTime: newIsLiveMode ? new Date() : state.selectedDateTime
        });
    }, [state.isLiveMode, state.selectedDateTime, updateState]);

    const handleRefresh = useCallback(async () => {
        updateState({ refreshing: true });
        await loadInitialData();
        updateState({ refreshing: false });
    }, [loadInitialData, updateState]);

    const executeTableAction = useCallback(async (action, billId, successMessage) => {
        try {
            updateState({ selectedTable: null });
            const result = await action(billId);
            if (result.success) {
                Alert.alert('Thành công', successMessage);
                await loadInitialData();
            } else {
                Alert.alert('Lỗi', result.msg || 'Không thể thực hiện thao tác');
            }
        } catch (error) {
            console.error('Action error:', error);
            Alert.alert('Lỗi', 'Không thể thực hiện thao tác');
        }
    }, [loadInitialData, updateState]);

    const handleTablePress = useCallback((table) => {
        updateState({ selectedTable: table.id });
    }, [updateState]);

    const handleCloseModal = useCallback(() => {
        updateState({ selectedTable: null });
    }, [updateState]);

    // ===================
    // RENDER COMPONENTS
    // ===================
    const DateTimeControls = useMemo(() => (
        <View style={styles.dateTimeControls}>
            <Pressable
                style={[styles.modeToggle, state.isLiveMode && styles.modeToggleActive]}
                onPress={toggleLiveMode}
            >
                <MaterialIcons
                    name={state.isLiveMode ? "access-time" : "schedule"}
                    size={14}
                    color={state.isLiveMode ? 'white' : theme.colors.text}
                />
                <Text style={[styles.modeToggleText, state.isLiveMode && styles.modeToggleTextActive]}>
                    {state.isLiveMode ? 'LIVE' : 'Tùy chỉnh'}
                </Text>
            </Pressable>

            {!state.isLiveMode && (
                <View style={styles.customTimeControls}>
                    <Pressable
                        style={styles.dateTimeButton}
                        onPress={() => updateState({ showDatePicker: true })}
                    >
                        <MaterialIcons name="calendar-today" size={14} color={theme.colors.text} />
                        <Text style={styles.dateTimeButtonText}>
                            {state.selectedDateTime.toLocaleDateString('vi-VN')}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.dateTimeButton}
                        onPress={() => updateState({ showTimePicker: true })}
                    >
                        <MaterialIcons name="access-time" size={14} color={theme.colors.text} />
                        <Text style={styles.dateTimeButtonText}>
                            {state.selectedDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    </Pressable>
                    
                    {/* Nút refresh ở custom mode */}
                    <Pressable style={styles.refreshButton} onPress={handleRefresh}>
                        <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
                    </Pressable>
                </View>
            )}

            {state.isLiveMode && (
                <View style={styles.liveTimeContainer}>
                    <Text style={styles.liveTimeDisplay}>
                        {state.currentLiveTime.toLocaleString('vi-VN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                        })}
                    </Text>
                    {/* Nút refresh ở live mode */}
                    <Pressable style={styles.refreshButton} onPress={handleRefresh}>
                        <MaterialIcons name="refresh" size={16} color={theme.colors.primary} />
                    </Pressable>
                </View>
            )}
        </View>
    ), [state.isLiveMode, state.selectedDateTime, state.currentLiveTime, toggleLiveMode, updateState, handleRefresh]);

    const StatsBar = useMemo(() => (
        <View style={styles.statsBar}>
            <MaterialIcons name="dashboard" size={16} color={theme.colors.text} />
            <Text style={styles.statsText}>
                {formattedDateTime}: {tableStats[TABLE_STATUS.OCCUPIED] + tableStats[TABLE_STATUS.RESERVED]}/{tableStats.total} bàn hoạt động
            </Text>
        </View>
    ), [formattedDateTime, tableStats]);

    const FloorTabs = useMemo(() => (
        <View style={styles.floorTabsContainer}>
            <FlatList
                data={state.floors}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: floor, index }) => {
                    const floorTables = tablesByFloor[floor] || [];
                    const activeCount = floorTables.filter(t =>
                        [TABLE_STATUS.OCCUPIED, TABLE_STATUS.RESERVED].includes(t.status)
                    ).length;

                    return (
                        <Pressable
                            style={[
                                styles.floorTab,
                                state.currentFloor === index && styles.activeFloorTab
                            ]}
                            onPress={() => {
                                updateState({ currentFloor: index, selectedTable: null });
                                pagerRef.current?.setPage(index);
                            }}
                        >
                            <Text style={[
                                styles.floorTabText,
                                state.currentFloor === index && styles.activeFloorTabText
                            ]}>
                                Tầng {floor}
                            </Text>
                            <Text style={[
                                styles.floorTabCount,
                                state.currentFloor === index && styles.activeFloorTabCount
                            ]}>
                                {activeCount}/{floorTables.length}
                            </Text>
                        </Pressable>
                    );
                }}
                keyExtractor={(item) => item.toString()}
                contentContainerStyle={styles.floorTabsList}
            />
        </View>
    ), [state.floors, state.currentFloor, tablesByFloor, updateState]);

    const FloorPage = useCallback(({ floor }) => {
        const floorTables = tablesByFloor[floor] || [];
        const floorStats = {
            [TABLE_STATUS.OCCUPIED]: 0,
            [TABLE_STATUS.RESERVED]: 0,
            [TABLE_STATUS.EMPTY]: 0
        };
        floorTables.forEach(table => {
            if (table.status) {
                floorStats[table.status]++;
            }
        });

        return (
            <View style={styles.floorContainer}>
                <FlatList
                    data={floorTables}
                    renderItem={({ item }) => (
                        <MyTableItem
                            item={item}
                            tableClick={handleTablePress}
                            isSelected={state.selectedTable === item.id}
                        />
                    )}
                    numColumns={3}
                    key={`floor-${floor}-3cols`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.tablesList}
                    refreshControl={
                        <RefreshControl
                            refreshing={state.refreshing}
                            onRefresh={handleRefresh}
                            colors={[theme.colors.primary]}
                        />
                    }
                    ListHeaderComponent={
                        <View style={styles.floorStats}>
                            {Object.values(TABLE_STATUS).map(status => {
                                const config = TABLE_STATUS_CONFIG[status];
                                return (
                                    <View key={status} style={styles.statItem}>
                                        <Text style={[styles.statNumber, { color: config.color }]}>
                                            {floorStats[status]}
                                        </Text>
                                        <Text style={styles.statLabel}>{config.text}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyFloor}>
                            <MaterialIcons name="restaurant" size={60} color={theme.colors.textLight} />
                            <Text style={styles.emptyFloorText}>Tầng {floor} chưa có bàn nào</Text>
                        </View>
                    }
                />
            </View>
        );
    }, [tablesByFloor, handleTablePress, state.selectedTable, state.refreshing, handleRefresh]);

    const TableActionModal = useMemo(() => {
        if (!state.selectedTable) return null;

        const table = state.tables.find(t => t.id === state.selectedTable);
        if (!table) return null;

        const billTime = table.bill ? new Date(table.bill.time) : null;
        const minutesDiff = billTime ? Math.floor((currentReferenceTime.getTime() - billTime.getTime()) / 60000) : 0;
        const statusConfig = TABLE_STATUS_CONFIG[table.status];

        const getDisplayStatus = () => {
            if (!table.bill) return 'Bàn trống';

            if (table.bill.state === BILL_STATE.IN_ORDER && table.bill.visit === VISIT_STATUS.ON_PROCESS) {
                return `Đặt bàn (${-minutesDiff > 0 ? `${-minutesDiff}p nữa` : `trễ ${minutesDiff}p`})`;
            }
            if (table.bill.state === BILL_STATE.IN_ORDER && table.bill.visit === VISIT_STATUS.VISITED) {
                return `Có khách (${minutesDiff}p)`;
            }
            return 'Trạng thái khác';
        };

        return (
            <Modal
                visible={true}
                transparent
                animationType="slide"
                onRequestClose={handleCloseModal}
            >
                <Pressable style={styles.modalOverlay} onPress={handleCloseModal}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={[styles.modalHeader, { backgroundColor: statusConfig.bgColor }]}>
                            <View style={styles.modalHeaderLeft}>
                                <MaterialIcons
                                    name={statusConfig.icon}
                                    size={24}
                                    color={statusConfig.color}
                                />
                                <View style={styles.modalTitleContainer}>
                                    <Text style={[styles.modalTitle, { color: statusConfig.color }]}>
                                        Bàn {table.id} - {statusConfig.text}
                                    </Text>
                                    <Text style={styles.modalSubtitle}>
                                        Tầng {table.floor} • {getDisplayStatus()}
                                    </Text>
                                </View>
                            </View>
                            <Pressable style={styles.closeButton} onPress={handleCloseModal}>
                                <MaterialIcons name="close" size={20} color={theme.colors.textLight} />
                            </Pressable>
                        </View>

                        {/* Content */}
                        <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                            {table.bill ? (
                                <>
                                    <View style={styles.customerInfo}>
                                        <Text style={styles.customerName}>
                                            👤 {table.bill.name || 'Khách hàng'}
                                        </Text>
                                        <Text style={styles.customerDetails}>
                                            👥 {table.bill.num_people} người
                                        </Text>
                                        <Text style={styles.customerDetails}>
                                            ⏰ Đặt lúc: {billTime?.toLocaleString('vi-VN')}
                                        </Text>
                                    </View>

                                    <View style={styles.statusInfo}>
                                        <Text style={styles.statusLabel}>Chi tiết trạng thái:</Text>
                                        <View style={styles.statusRow}>
                                            <Text style={styles.statusDetail}>
                                                📋 State: {table.bill.state}
                                            </Text>
                                            <Text style={styles.statusDetail}>
                                                👥 Visit: {table.bill.visit}
                                            </Text>
                                        </View>

                                        <Text style={styles.timeInfo}>
                                            ⏱️ Logic: {table.bill.state} + {table.bill.visit} = {table.status?.toUpperCase()}
                                        </Text>

                                        <Text style={styles.timeInfo}>
                                            🕐 Thời gian: {minutesDiff >= 0 ? `${minutesDiff}p từ lúc đặt` : `${-minutesDiff}p nữa đến giờ`}
                                        </Text>
                                    </View>
                                </>
                            ) : (
                                <View style={styles.emptyTableInfo}>
                                    <MaterialIcons name="restaurant" size={40} color={theme.colors.textLight} />
                                    <Text style={styles.emptyTableText}>
                                        Bàn hiện đang trống
                                    </Text>
                                    <Text style={styles.emptyTableSubText}>
                                        Sẵn sàng phục vụ khách hàng mới
                                    </Text>
                                </View>
                            )}
                        </ScrollView>

                        {/* Actions */}
                        <View style={styles.modalActions}>
                            {table.status === TABLE_STATUS.RESERVED && (
                                <>
                                    <Pressable
                                        style={[styles.actionButton, styles.checkinButton]}
                                        onPress={() => executeTableAction(checkinCustomer, table.bill.id, 'Khách đã check-in')}
                                    >
                                        <MaterialIcons name="login" size={18} color="white" />
                                        <Text style={styles.actionButtonText}>Check-in</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.actionButton, styles.cancelButton]}
                                        onPress={() => executeTableAction(cancelReservation, table.bill.id, 'Đã hủy đặt bàn')}
                                    >
                                        <MaterialIcons name="cancel" size={18} color="white" />
                                        <Text style={styles.actionButtonText}>Hủy đặt</Text>
                                    </Pressable>
                                </>
                            )}

                            {table.status === TABLE_STATUS.OCCUPIED && (
                                <>
                                    <Pressable
                                        style={[styles.actionButton, styles.checkoutButton]}
                                        onPress={() => executeTableAction(checkoutCustomer, table.bill.id, 'Khách đã checkout')}
                                    >
                                        <MaterialIcons name="check-circle" size={18} color="white" />
                                        <Text style={styles.actionButtonText}>Hoàn thành</Text>
                                    </Pressable>
                                    <Pressable
                                        style={[styles.actionButton, styles.detailButton]}
                                        onPress={() => {
                                            handleCloseModal();
                                            router.push({ pathname: '../assignTableScr', params: { billId: table.bill.id } });
                                        }}
                                    >
                                        <MaterialIcons name="info" size={18} color={theme.colors.primary} />
                                        <Text style={[styles.actionButtonText, { color: theme.colors.primary }]}>Cập nhật đơn</Text>
                                    </Pressable>
                                </>
                            )}

                            {table.status === TABLE_STATUS.EMPTY && (
                                <Pressable
                                    style={[styles.actionButton, styles.createButton]}
                                    onPress={() => {
                                        handleCloseModal();
                                        router.push({ pathname: '../assignTableScr', params: { tableId: table.id } });
                                    }}
                                >
                                    <MaterialIcons name="add-circle" size={18} color="white" />
                                    <Text style={styles.actionButtonText}>Tạo đơn mới</Text>
                                </Pressable>
                            )}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        );
    }, [state.selectedTable, state.tables, currentReferenceTime, executeTableAction, router, handleCloseModal]);

    const StatusLegend = useMemo(() => (
        <View style={styles.legend}>
            <View style={styles.legendItems}>
                {Object.values(TABLE_STATUS).map(status => {
                    const config = TABLE_STATUS_CONFIG[status];
                    const rule = status === TABLE_STATUS.RESERVED ? ' (35p trước)' :
                        status === TABLE_STATUS.OCCUPIED ? ' (40p tối đa)' : '';

                    return (
                        <View key={status} style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: config.color }]} />
                            <Text style={styles.legendText}>{config.text}{rule}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    ), []);

    // ===================
    // EFFECTS
    // ===================
    // Live time update effect - THÊM MỚI
    useEffect(() => {
        if (state.isLiveMode) {
            startLiveTimeUpdate();
        } else {
            stopLiveTimeUpdate();
        }

        return () => {
            stopLiveTimeUpdate();
        };
    }, [state.isLiveMode, startLiveTimeUpdate, stopLiveTimeUpdate]);

    useEffect(() => {
        isUnmountedRef.current = false;
        loadInitialData();

        return () => {
            isUnmountedRef.current = true;
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
            stopAutoCheck();
            stopLiveTimeUpdate(); // THÊM MỚI
        };
    }, [loadInitialData, stopAutoCheck, stopLiveTimeUpdate]);

    // Refresh when change time (not in live mode)
    useEffect(() => {
        if (!state.isLiveMode && !isUnmountedRef.current) {
            refreshTableData();
        }
    }, [state.selectedDateTime, state.isLiveMode, refreshTableData]);

    // Setup auto-check and real-time when switching to live mode
    useEffect(() => {
        console.log('🔧 Setting up live mode:', state.isLiveMode);

        // Clean up previous setup
        stopAutoCheck();
        if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
        }

        if (state.isLiveMode && !isUnmountedRef.current) {
            // Refresh live mode
            refreshTableData();

            // Start auto-check
            startAutoCheck();

            // Setup real-time subscription
            channelRef.current = supabase
                .channel('bills-changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'bills'
                }, (payload) => {
                    console.log('📡 Real-time update received:', payload.eventType);
                    if (state.isLiveMode && !isUnmountedRef.current) {
                        refreshTableData();
                    }
                })
                .subscribe();

            console.log('📡 Real-time subscription active');
        }

        return () => {
            if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
            }
        };
    }, [state.isLiveMode, startAutoCheck, stopAutoCheck, refreshTableData]);

    // ===================
    // MAIN RENDER
    // ===================
    if (state.loading) {
        return (
            <ScreenWrapper bg={'#FFBF00'}>
                <View style={[styles.container, styles.centerContent]}>
                    <MaterialIcons name="restaurant" size={60} color={theme.colors.text} />
                    <Text style={styles.loadingText}>Đang tải dữ liệu bàn...</Text>
                    <Text style={styles.loadingSubText}>Smart Auto-Check System</Text>
                </View>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header - BỎ NÚT REFRESH */}
                <View style={styles.header}>
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Quản lý bàn</Text>
                        <View style={styles.realtimeIndicator}>
                            <View style={[styles.realtimeDot, {
                                backgroundColor: state.isLiveMode ? '#2ecc71' : '#f39c12'
                            }]} />
                            <Text style={[styles.realtimeText, {
                                color: state.isLiveMode ? '#2ecc71' : '#f39c12'
                            }]}>
                                {state.isLiveMode ? 'LIVE AUTO-CHECK' : 'MANUAL MODE'} {formatLastCheck} • {state.autoCheckStatus || 'Hoạt động'}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* DateTime Controls */}
                {DateTimeControls}

                {/* Stats Bar */}
                {StatsBar}

                {/* Floor Tabs */}
                {FloorTabs}

                {/* Tables Container */}
                <View style={styles.tablesContainer}>
                    <PagerView
                        ref={pagerRef}
                        style={styles.pagerView}
                        initialPage={0}
                        onPageSelected={(e) => {
                            updateState({
                                currentFloor: e.nativeEvent.position,
                                selectedTable: null
                            });
                        }}
                    >
                        {state.floors.map(floor => (
                            <View key={floor} style={styles.pageView}>
                                <FloorPage floor={floor} />
                            </View>
                        ))}
                    </PagerView>
                </View>

                {/* Status Legend */}
                {StatusLegend}

                {/* DateTime Pickers */}
                {state.showDatePicker && (
                    <DateTimePicker
                        value={state.selectedDateTime}
                        mode="date"
                        display="default"
                        onChange={(e, date) => handleDateTimeChange('date', date)}
                    />
                )}
                {state.showTimePicker && (
                    <DateTimePicker
                        value={state.selectedDateTime}
                        mode="time"
                        display="default"
                        onChange={(e, time) => handleDateTimeChange('time', time)}
                    />
                )}

                {/* Table Action Modal */}
                {TableActionModal}
            </View>
        </ScreenWrapper>
    );
};

export default manageTableScr;

// ===================
// STYLES - THÊM MỚI CHO LIVE TIME VÀ REFRESH BUTTON
// ===================
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp(3),
        backgroundColor: '#FFBF00'
    },
    centerContent: {
        justifyContent: 'center',
        alignItems: 'center'
    },

    // Header - BỎ actionButton
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: hp(8),
        paddingVertical: 5
    },
    titleContainer: {
        alignItems: 'center',
        flex: 1,
        paddingHorizontal: 10
    },
    title: {
        fontSize: hp(2.2),
        fontWeight: 'bold',
        color: theme.colors.text
    },
    realtimeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2
    },
    realtimeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 4
    },
    realtimeText: {
        fontSize: 9,
        fontWeight: '500'
    },

    // DateTime Controls - THÊM MỚI
    dateTimeControls: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: hp(6)
    },
    modeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
        backgroundColor: '#f0f0f0',
        gap: 4
    },
    modeToggleActive: {
        backgroundColor: theme.colors.primary
    },
    modeToggleText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.text
    },
    modeToggleTextActive: {
        color: 'white'
    },
    customTimeControls: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 4
    },
    dateTimeButtonText: {
        fontSize: 10,
        color: theme.colors.text,
        fontWeight: '500'
    },
    
    // Live Time Container - THÊM MỚI
    liveTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end'
    },
    liveTimeDisplay: {
        fontSize: 12,
        fontWeight: '600',
        color: '#2ecc71',
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        fontFamily: 'monospace',
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.3)'
    },
    refreshButton: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(46, 204, 113, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(46, 204, 113, 0.3)'
    },

    // Stats Bar
    statsBar: {
        backgroundColor: 'rgba(255,255,255,0.95)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        height: hp(5)
    },
    statsText: {
        fontSize: 11,
        color: theme.colors.text,
        fontWeight: '500',
        flex: 1
    },

    // Floor Navigation
    floorTabsContainer: {
        marginBottom: 8,
        height: hp(7)
    },
    floorTabsList: {
        paddingHorizontal: 5
    },
    floorTab: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 4,
        borderRadius: 12,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
        minWidth: 80,
        justifyContent: 'center'
    },
    activeFloorTab: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary
    },
    floorTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text
    },
    activeFloorTabText: {
        color: 'white'
    },
    floorTabCount: {
        fontSize: 8,
        color: theme.colors.textLight,
        marginTop: 1
    },
    activeFloorTabCount: {
        color: 'rgba(255,255,255,0.9)'
    },

    // Tables Container
    tablesContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
        overflow: 'hidden',
        marginBottom: 8
    },
    pagerView: {
        flex: 1
    },
    pageView: {
        flex: 1
    },
    floorContainer: {
        flex: 1,
        paddingTop: 8
    },
    floorStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: '#f8f9fa',
        marginBottom: 8,
        marginHorizontal: 12,
        borderRadius: 10
    },
    statItem: {
        alignItems: 'center'
    },
    statNumber: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    statLabel: {
        fontSize: 10,
        color: theme.colors.textLight,
        marginTop: 2,
        textAlign: 'center'
    },
    tablesList: {
        paddingHorizontal: 8,
        paddingBottom: 15
    },
    emptyFloor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 80
    },
    emptyFloorText: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginTop: 12,
        textAlign: 'center'
    },

    // Legend
    legend: {
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: hp(8),
        justifyContent: 'center'
    },
    legendTitle: {
        fontSize: 9,
        color: 'white',
        textAlign: 'center',
        marginBottom: 4
    },
    legendItems: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 5
    },
    legendText: {
        fontSize: 9,
        color: 'white',
        fontWeight: '500'
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: screenHeight * 0.8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 25
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    modalTitleContainer: {
        marginLeft: 12,
        flex: 1
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold'
    },
    modalSubtitle: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 2
    },
    closeButton: {
        padding: 8,
        borderRadius: 15,
        backgroundColor: 'rgba(0,0,0,0.05)'
    },
    modalBody: {
        maxHeight: screenHeight * 0.4
    },
    customerInfo: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    customerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4
    },
    customerDetails: {
        fontSize: 13,
        color: theme.colors.textLight,
        marginBottom: 2
    },
    statusInfo: {
        paddingHorizontal: 20,
        paddingVertical: 15
    },
    statusLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 8
    },
    statusRow: {
        marginBottom: 8
    },
    statusDetail: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginBottom: 2
    },
    timeInfo: {
        fontSize: 13,
        color: theme.colors.text,
        fontWeight: '500',
        marginBottom: 4
    },
    emptyTableInfo: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 30
    },
    emptyTableText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 5
    },
    emptyTableSubText: {
        fontSize: 13,
        color: theme.colors.textLight,
        textAlign: 'center'
    },
    modalActions: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0'
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 6
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: 'white'
    },
    checkoutButton: {
        backgroundColor: '#2ed573'
    },
    checkinButton: {
        backgroundColor: '#ff6b6b'
    },
    cancelButton: {
        backgroundColor: '#e74c3c'
    },
    createButton: {
        backgroundColor: theme.colors.primary
    },
    detailButton: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: theme.colors.primary
    },

    // Loading
    loadingText: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: '600',
        marginTop: 12,
        textAlign: 'center'
    },
    loadingSubText: {
        fontSize: 12,
        color: theme.colors.textLight,
        marginTop: 4,
        textAlign: 'center'
    }
});