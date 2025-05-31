import { Alert, Dimensions, FlatList, Pressable, StyleSheet, Text, View, RefreshControl } from 'react-native'
import React, { useEffect, useState, useRef } from 'react'
import ScreenWrapper from '../../../components/ScreenWrapper'
import { hp, wp } from '../../../helper/common'
import { theme } from '../../../constants/theme'
import MyBackButton from '../../../components/MyBackButton'
import MyTableItem from '../../../components/MyTableItem'
import MaterialIcons from '@expo/vector-icons/MaterialIcons'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { 
    getAllFloors, 
    getTablesWithBillStatus, 
    getTimeUntilNextBill,
    checkinCustomer,
    checkoutCustomer,
    cancelReservation
} from '../../../services/tableService'
import { supabase } from '../../../lib/supabase'
import PagerView from 'react-native-pager-view'

const { width: screenWidth } = Dimensions.get('window');

const tableManageScr = () => {
    const router = useRouter();
    const pagerRef = useRef(null);
    const autoCheckIntervalRef = useRef(null);
    
    // States
    const [floors, setFloors] = useState([]);
    const [currentFloor, setCurrentFloor] = useState(0);
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTable, setSelectedTable] = useState(null);
    const [lastAutoCheck, setLastAutoCheck] = useState(new Date());
    const [autoCheckStatus, setAutoCheckStatus] = useState('');
    const [statusChanges, setStatusChanges] = useState(0);
    const [dataFixes, setDataFixes] = useState(0);
    const [businessFixes, setBusinessFixes] = useState(0);
    
    // DateTime Picker States
    const [selectedDateTime, setSelectedDateTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isLiveMode, setIsLiveMode] = useState(true); // Live mode vs custom time

    // Khởi tạo
    useEffect(() => {
        initializeScreen();
        return cleanup;
    }, []);

    // Re-calculate khi selectedDateTime thay đổi
    useEffect(() => {
        if (!isLiveMode) {
            refreshTableDataWithCustomTime();
        }
    }, [selectedDateTime, isLiveMode]);

    const initializeScreen = async () => {
        await loadInitialData();
        setupRealtimeSubscription();
        startAutoCheck();
    };

    const cleanup = () => {
        console.log('🧹 Cleaning up screen...');
        supabase.removeAllChannels();
        stopAutoCheck();
    };

    // ===================
    // DATETIME MANAGEMENT
    // ===================

    const getCurrentReferenceTime = () => {
        return isLiveMode ? new Date() : selectedDateTime;
    };

    const formatSelectedDateTime = () => {
        if (isLiveMode) return 'Thời gian thực';
        return selectedDateTime.toLocaleString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const onDateChange = (event, date) => {
        setShowDatePicker(false);
        if (date) {
            // Giữ nguyên thời gian, chỉ thay đổi ngày
            const newDateTime = new Date(selectedDateTime);
            newDateTime.setFullYear(date.getFullYear());
            newDateTime.setMonth(date.getMonth());
            newDateTime.setDate(date.getDate());
            setSelectedDateTime(newDateTime);
        }
    };

    const onTimeChange = (event, time) => {
        setShowTimePicker(false);
        if (time) {
            // Giữ nguyên ngày, chỉ thay đổi thời gian
            const newDateTime = new Date(selectedDateTime);
            newDateTime.setHours(time.getHours());
            newDateTime.setMinutes(time.getMinutes());
            newDateTime.setSeconds(0);
            newDateTime.setMilliseconds(0);
            setSelectedDateTime(newDateTime);
        }
    };

    const toggleLiveMode = () => {
        if (isLiveMode) {
            // Chuyển sang custom mode, set time hiện tại
            setSelectedDateTime(new Date());
            setIsLiveMode(false);
        } else {
            // Chuyển về live mode
            setIsLiveMode(true);
        }
    };

    // ===================
    // ENHANCED TABLE STATUS LOGIC
    // ===================

    const determineTableStatusWithCustomTime = (bill, referenceTime) => {
        if (!bill) return 'empty';
        
        const billTime = new Date(bill.time);
        const minutesUntilBill = Math.floor((billTime.getTime() - referenceTime.getTime()) / (1000 * 60));
        
        console.log(`🔍 Determining status for bill ${bill.id} at reference time ${referenceTime.toLocaleTimeString()}: state=${bill.state}, visit=${bill.visit}, minutesUntil=${minutesUntilBill}`);
        
        switch (bill.state) {
            case 'in_order':
                switch (bill.visit) {
                    case 'in_process':
                        // Kiểm tra xem có quá 30 phút kể từ thời điểm time của bill không
                        const minutesSinceBillTime = Math.floor((referenceTime.getTime() - billTime.getTime()) / (1000 * 60));
                        
                        if (minutesSinceBillTime <= 30) {
                            console.log(`✅ Bill ${bill.id}: in_process within 30min = occupied (${minutesSinceBillTime}min)`);
                            return 'occupied';  // Vẫn đang trong thời gian sử dụng hợp lý
                        } else {
                            console.log(`⚠️ Bill ${bill.id}: in_process over 30min = empty (${minutesSinceBillTime}min, should be auto-checked out)`);
                            return 'empty';     // Đã quá 30 phút, cần checkout
                        }
                        
                    case 'un_visited':
                        // Chỉ hiển thị đặt bàn trong vòng 10 phút tới
                        if (minutesUntilBill > 0 && minutesUntilBill <= 10) {
                            console.log(`✅ Bill ${bill.id}: reserved in next 10min = reserved (${minutesUntilBill}min)`);
                            return 'reserved';  // Đặt bàn trong 10 phút tới
                        } else if (minutesUntilBill <= 0 && minutesUntilBill >= -5) {
                            console.log(`✅ Bill ${bill.id}: ready for checkin = ready (${Math.abs(minutesUntilBill)}min late)`);
                            return 'ready';     // Đã đến giờ, sẵn sàng checkin (trong vòng 5 phút)
                        } else {
                            console.log(`📝 Bill ${bill.id}: outside 10min window = empty (${minutesUntilBill}min)`);
                            return 'empty';     // Ngoài khung 10 phút
                        }
                        
                    case 'visited':
                        console.warn(`⚠️ Inconsistent data: Bill ${bill.id} is visited but still in_order`);
                        return 'empty';
                        
                    default:
                        console.warn(`⚠️ Unknown visit status: ${bill.visit} for bill ${bill.id}`);
                        return 'empty';
                }
                
            case 'completed':
            case 'cancelled':
                console.log(`✅ Bill ${bill.id}: ${bill.state} = empty`);
                return 'empty';
                
            default:
                console.warn(`⚠️ Unknown state: ${bill.state} for bill ${bill.id}`);
                return 'empty';
        }
    };

    // ===================
    // DATA LOADING WITH CUSTOM TIME
    // ===================

    const refreshTableDataWithCustomTime = async () => {
        try {
            console.log(`🔄 Refreshing table data with reference time: ${getCurrentReferenceTime().toLocaleString()}`);
            
            // Lấy tất cả bàn và bills
            const tablesResult = await getTablesWithBillStatus();
            if (!tablesResult.success) {
                console.error('Failed to get tables');
                return;
            }

            const referenceTime = getCurrentReferenceTime();
            
            // Tính toán lại status cho từng bàn dựa trên thời gian tham chiếu
            const updatedTables = tablesResult.data.map(table => {
                if (table.bill) {
                    const newStatus = determineTableStatusWithCustomTime(table.bill, referenceTime);
                    return {
                        ...table,
                        status: newStatus
                    };
                }
                return {
                    ...table,
                    status: 'empty'
                };
            });

            setTables(updatedTables);
            console.log('✅ Tables refreshed with custom time logic');
            
        } catch (error) {
            console.error('❌ Error refreshing table data with custom time:', error);
        }
    };

    const loadInitialData = async () => {
        setLoading(true);
        try {
            console.log('📥 Loading initial data...');
            
            // Load floors
            const floorsResult = await getAllFloors();
            if (floorsResult.success) {
                setFloors(floorsResult.data);
                console.log('✅ Floors loaded:', floorsResult.data);
            }

            // Load tables with custom time logic
            if (isLiveMode) {
                const tablesResult = await getTablesWithBillStatus();
                if (tablesResult.success) {
                    setTables(tablesResult.data);
                    console.log('✅ Tables loaded (live mode):', tablesResult.data.length, 'tables');
                } else {
                    Alert.alert('Lỗi', tablesResult.msg);
                }
            } else {
                await refreshTableDataWithCustomTime();
            }

        } catch (error) {
            console.error('❌ Load data error:', error);
            Alert.alert('Lỗi', 'Không thể tải dữ liệu');
        }
        setLoading(false);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadInitialData();
        setRefreshing(false);
    };

    // ===================
    // ENHANCED AUTO-CHECK (chỉ hoạt động trong live mode)
    // ===================

    const startAutoCheck = () => {
        if (!isLiveMode) {
            console.log('🚫 Auto-check disabled in custom time mode');
            return;
        }
        
        console.log('🤖 Starting enhanced auto-check system (1 minute intervals)');
        
        autoCheckIntervalRef.current = setInterval(async () => {
            if (!isLiveMode) {
                console.log('🚫 Skipping auto-check (not in live mode)');
                return;
            }
            
            const checkTime = new Date().toLocaleTimeString('vi-VN');
            console.log(`⏰ Enhanced auto-check triggered at ${checkTime}`);
            
            setLastAutoCheck(new Date());
            setAutoCheckStatus('Đang kiểm tra...');
            
            try {
                await performEnhancedAutoCheck();
            } catch (error) {
                console.error('❌ Enhanced auto-check failed:', error);
                setAutoCheckStatus('✗ Lỗi kiểm tra');
                setTimeout(() => setAutoCheckStatus(''), 5000);
            }
            
        }, 60000); // 1 phút
    };

    const stopAutoCheck = () => {
        if (autoCheckIntervalRef.current) {
            console.log('🛑 Stopping enhanced auto-check system');
            clearInterval(autoCheckIntervalRef.current);
            autoCheckIntervalRef.current = null;
        }
    };

    const performEnhancedAutoCheck = async () => {
        try {
            console.log('🔍 Performing enhanced auto-check with new logic...');
            
            const currentStatus = getCurrentTableStatus();
            const now = new Date();
            
            // Lấy tất cả bills để kiểm tra
            const { data: allBills, error: billError } = await supabase
                .from('bills')
                .select('*');

            if (billError) {
                throw new Error('Failed to fetch bills: ' + billError.message);
            }

            console.log(`📊 Found ${allBills.length} total bills to analyze`);
            
            // Enhanced business logic checks
            const businessFixCount = await performEnhancedBusinessLogicChecks(allBills, now);
            setBusinessFixes(businessFixCount);
            
            // Data inconsistency fixes
            const dataFixCount = await checkAndFixDataInconsistency(allBills);
            setDataFixes(dataFixCount);
            
            // Lấy trạng thái mới
            const tablesResult = await getTablesWithBillStatus();
            if (!tablesResult.success) {
                throw new Error('Failed to get updated table status');
            }
            
            const newTables = tablesResult.data;
            const newStatus = getTableStatusFromData(newTables);
            
            const changes = compareTableStatus(currentStatus, newStatus);
            setStatusChanges(changes.total);
            
            setTables(newTables);
            
            const totalActions = dataFixCount + businessFixCount;
            let statusText;
            
            if (changes.total > 0 && totalActions > 0) {
                statusText = `✓ ${changes.total} thay đổi, ${totalActions} sửa lỗi`;
            } else if (changes.total > 0) {
                statusText = `✓ ${changes.total} thay đổi`;
            } else if (totalActions > 0) {
                statusText = `✓ ${totalActions} sửa lỗi`;
            } else {
                statusText = '✓ Tất cả ổn định';
            }
            
            setAutoCheckStatus(statusText);
            
            logEnhancedAutoCheckResult(changes, dataFixCount, businessFixCount, allBills.length);
            
            setTimeout(() => setAutoCheckStatus(''), 15000);
            
        } catch (error) {
            console.error('❌ Enhanced auto-check error:', error);
            setAutoCheckStatus('✗ Lỗi kiểm tra');
            throw error;
        }
    };

    const performEnhancedBusinessLogicChecks = async (bills, referenceTime) => {
        console.log('⚡ Performing enhanced business logic checks...');
        let fixCount = 0;
        const fixes = [];

        const activeBills = bills.filter(bill => bill.state === 'in_order');
        console.log(`📋 Checking ${activeBills.length} active bills for enhanced business logic`);

        for (const bill of activeBills) {
            const billTime = new Date(bill.time);
            const minutesDiff = Math.floor((referenceTime.getTime() - billTime.getTime()) / (1000 * 60));

            // Enhanced Check 1: Auto-checkout occupied tables after 30 minutes from bill time
            if (bill.visit === 'in_process' && minutesDiff > 30) {
                fixes.push({
                    id: bill.id,
                    currentState: bill.state,
                    currentVisit: bill.visit,
                    newState: 'completed',
                    newVisit: 'visited',
                    reason: `Auto-checkout after 30 minutes from bill time (${minutesDiff} min)`,
                    type: 'auto-checkout-30min'
                });
                console.log(`🕒 Enhanced Fix: Bill ${bill.id} auto-checkout after ${minutesDiff} minutes from bill time`);
            }
            
            // Enhanced Check 2: Cancel no-show reservations (5 minutes after bill time)
            else if (bill.visit === 'un_visited' && minutesDiff > 5) {
                fixes.push({
                    id: bill.id,
                    currentState: bill.state,
                    currentVisit: bill.visit,
                    newState: 'cancelled',
                    newVisit: 'un_visited',
                    reason: `No-show cancellation after 5 minutes past bill time (${minutesDiff} min)`,
                    type: 'no-show-5min'
                });
                console.log(`❌ Enhanced Fix: Bill ${bill.id} no-show cancellation after ${minutesDiff} minutes`);
            }
        }

        console.log(`📝 Found ${fixes.length} enhanced business logic issues to fix`);

        // Thực hiện enhanced fixes
        for (const fix of fixes) {
            try {
                const { error } = await supabase
                    .from('bills')
                    .update({
                        state: fix.newState,
                        visit: fix.newVisit
                    })
                    .eq('id', fix.id);

                if (!error) {
                    fixCount++;
                    console.log(`✅ Enhanced business fix applied to bill ${fix.id}: ${fix.reason}`);
                } else {
                    console.error(`❌ Failed to apply enhanced business fix to bill ${fix.id}:`, error);
                }
            } catch (error) {
                console.error(`❌ Error applying enhanced business fix to bill ${fix.id}:`, error);
            }
        }

        console.log(`🎯 Enhanced business logic fix completed: ${fixCount}/${fixes.length} successful`);
        return fixCount;
    };

    // ===================
    // ENHANCED UTILITY FUNCTIONS
    // ===================

    const getUpcomingTablesWithCustomTime = () => {
        const referenceTime = getCurrentReferenceTime();
        const futureTime = new Date(referenceTime.getTime() + (10 * 60 * 1000)); // 10 phút tới
        
        return tables.filter(table => {
            if (table.status !== 'reserved' || !table.bill) return false;
            const billTime = new Date(table.bill.time);
            return billTime >= referenceTime && billTime <= futureTime;
        });
    };

    const getActiveTablesInfo = () => {
        const referenceTime = getCurrentReferenceTime();
        const occupiedTables = tables.filter(t => t.status === 'occupied');
        
        return {
            occupied: occupiedTables.length,
            reserved: tables.filter(t => t.status === 'reserved').length,
            ready: tables.filter(t => t.status === 'ready').length,
            empty: tables.filter(t => t.status === 'empty').length,
            total: tables.length,
            occupiedDetails: occupiedTables.map(table => {
                if (table.bill) {
                    const billTime = new Date(table.bill.time);
                    const minutesSinceBillTime = Math.floor((referenceTime.getTime() - billTime.getTime()) / (1000 * 60));
                    return {
                        id: table.id,
                        minutesSinceBillTime,
                        customerName: table.bill.name,
                        numPeople: table.bill.num_people
                    };
                }
                return null;
            }).filter(Boolean)
        };
    };

    // ===================
    // EXISTING FUNCTIONS (giữ nguyên logic cũ)
    // ===================

    const setupRealtimeSubscription = () => {
        if (!isLiveMode) {
            console.log('📡 Realtime disabled in custom time mode');
            return;
        }
        
        console.log('📡 Setting up realtime subscriptions...');
        
        supabase
            .channel('bills-changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'bills' 
            }, (payload) => {
                console.log('💫 Bills change detected:', payload.eventType, 'for bill', payload.new?.id || payload.old?.id);
                if (isLiveMode) {
                    refreshTableData();
                }
            })
            .subscribe();

        supabase
            .channel('detailBills-changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'detailBills' 
            }, (payload) => {
                console.log('💫 DetailBills change detected:', payload.eventType);
                if (isLiveMode) {
                    refreshTableData();
                }
            })
            .subscribe();
    };

    const refreshTableData = async () => {
        try {
            console.log('🔄 Refreshing table data...');
            if (isLiveMode) {
                const tablesResult = await getTablesWithBillStatus();
                if (tablesResult.success) {
                    setTables(tablesResult.data);
                    console.log('✅ Tables refreshed (live mode)');
                }
            } else {
                await refreshTableDataWithCustomTime();
            }
        } catch (error) {
            console.error('❌ Error refreshing table data:', error);
        }
    };

    // Auto-check restart khi chuyển mode
    useEffect(() => {
        stopAutoCheck();
        if (isLiveMode) {
            startAutoCheck();
        }
    }, [isLiveMode]);

    // ... (giữ nguyên tất cả các functions khác: manualAutoCheck, checkAndFixDataInconsistency, 
    // handleTablePress, handleOccupiedTable, handleReservedTable, handleReadyTable, 
    // handleEmptyTable, utility functions, v.v.)

    const checkAndFixDataInconsistency = async (bills) => {
        console.log('🔧 Checking data inconsistency...');
        let fixCount = 0;
        const fixes = [];

        for (const bill of bills) {
            let needsFix = false;
            let newState = bill.state;
            let newVisit = bill.visit;
            let reason = '';

            if (bill.state === 'completed' && bill.visit === 'in_process') {
                newVisit = 'visited';
                needsFix = true;
                reason = 'Completed bill should be visited, not in_process';
            } else if (bill.state === 'cancelled' && bill.visit === 'in_process') {
                newVisit = 'un_visited';
                needsFix = true;
                reason = 'Cancelled bill should be un_visited, not in_process';
            } else if (bill.state === 'in_order' && bill.visit === 'visited') {
                newState = 'completed';
                needsFix = true;
                reason = 'Visited bill should be completed, not in_order';
            }

            if (needsFix) {
                fixes.push({
                    id: bill.id,
                    currentState: bill.state,
                    currentVisit: bill.visit,
                    newState: newState,
                    newVisit: newVisit,
                    reason: reason
                });
            }
        }

        for (const fix of fixes) {
            try {
                const { error } = await supabase
                    .from('bills')
                    .update({
                        state: fix.newState,
                        visit: fix.newVisit
                    })
                    .eq('id', fix.id);

                if (!error) {
                    fixCount++;
                    console.log(`✅ Fixed bill ${fix.id}: ${fix.reason}`);
                }
            } catch (error) {
                console.error(`❌ Error fixing bill ${fix.id}:`, error);
            }
        }

        return fixCount;
    };

    const manualAutoCheck = async () => {
        setRefreshing(true);
        setAutoCheckStatus('Kiểm tra thủ công...');
        
        try {
            const beforeCounts = getStatusCounts();
            
            if (isLiveMode) {
                await performEnhancedAutoCheck();
            } else {
                await refreshTableDataWithCustomTime();
            }
            
            const afterCounts = getStatusCounts();
            const changes = calculateStatusChanges(beforeCounts, afterCounts);
            const totalStatusChanges = Object.values(changes).reduce((sum, val) => sum + Math.abs(val), 0);
            
            let message = `🔍 Kết quả kiểm tra (${formatSelectedDateTime()}):\n\n`;
            
            message += '📊 TRẠNG THÁI BÀN:\n';
            message += `🔴 Có khách: ${afterCounts.occupied} (${formatChange(changes.occupied)})\n`;
            message += `🟠 Đã đặt: ${afterCounts.reserved} (${formatChange(changes.reserved)})\n`;
            message += `🟡 Sẵn sàng: ${afterCounts.ready} (${formatChange(changes.ready)})\n`;
            message += `🟢 Trống: ${afterCounts.empty} (${formatChange(changes.empty)})\n\n`;
            
            if (isLiveMode) {
                message += '🔧 SỬA LỖI ĐÃ THỰC HIỆN:\n';
                message += `📝 Sửa dữ liệu: ${dataFixes} lỗi\n`;
                message += `⚡ Logic nghiệp vụ: ${businessFixes} hành động\n\n`;
                
                const totalActions = dataFixes + businessFixes;
                if (totalStatusChanges > 0 && totalActions > 0) {
                    message += `✨ Tổng kết: ${totalStatusChanges} thay đổi, ${totalActions} sửa lỗi`;
                } else if (totalStatusChanges > 0) {
                    message += `✨ Tổng kết: ${totalStatusChanges} thay đổi`;
                } else if (totalActions > 0) {
                    message += `✨ Tổng kết: ${totalActions} lỗi đã được sửa`;
                } else {
                    message += '✨ Tổng kết: Tất cả đều ổn định';
                }
            } else {
                message += '⏰ Chế độ thời gian tùy chỉnh - Chỉ hiển thị trạng thái theo thời gian đã chọn';
            }
            
            Alert.alert(
                isLiveMode && (totalStatusChanges > 0 || (dataFixes + businessFixes) > 0) ? '✅ Có cập nhật' : '✅ Hoàn tất',
                message
            );
            
        } catch (error) {
            Alert.alert('❌ Lỗi', 'Không thể thực hiện kiểm tra');
        }
        
        setRefreshing(false);
    };

    // ... (tất cả utility functions khác giữ nguyên)

    const getCurrentTableStatus = () => {
        const status = {};
        tables.forEach(table => {
            status[table.id] = table.status;
        });
        return status;
    };

    const getTableStatusFromData = (tablesData) => {
        const status = {};
        tablesData.forEach(table => {
            status[table.id] = table.status;
        });
        return status;
    };

    const compareTableStatus = (current, newStatus) => {
        const changes = { details: [], total: 0 };
        
        Object.keys(newStatus).forEach(tableId => {
            if (current[tableId] !== newStatus[tableId]) {
                changes.details.push({
                    tableId,
                    from: current[tableId] || 'unknown',
                    to: newStatus[tableId]
                });
                changes.total++;
            }
        });
        
        return changes;
    };

    const getStatusCounts = () => {
        return {
            occupied: tables.filter(t => t.status === 'occupied').length,
            reserved: tables.filter(t => t.status === 'reserved').length,
            ready: tables.filter(t => t.status === 'ready').length,
            empty: tables.filter(t => t.status === 'empty').length,
            total: tables.length
        };
    };

    const calculateStatusChanges = (before, after) => {
        return {
            occupied: after.occupied - before.occupied,
            reserved: after.reserved - before.reserved,
            ready: after.ready - before.ready,
            empty: after.empty - before.empty
        };
    };

    const formatChange = (change) => {
        if (change === 0) return 'không đổi';
        return change > 0 ? `+${change}` : `${change}`;
    };

    const formatLastCheck = () => {
        const diff = Math.floor((new Date() - lastAutoCheck) / 1000);
        if (diff < 60) return `${diff}s`;
        return `${Math.floor(diff / 60)}m`;
    };

    const getTablesByFloor = (floor) => {
        return tables
            .filter(table => table.floor === floor)
            .sort((a, b) => a.id - b.id);
    };

    const logEnhancedAutoCheckResult = (changes, dataFixCount, businessFixCount, totalBills) => {
        const time = new Date().toLocaleTimeString('vi-VN');
        console.log(`\n📋 ===== ENHANCED AUTO-CHECK RESULT at ${time} =====`);
        console.log(`📊 Total bills analyzed: ${totalBills}`);
        console.log(`🔄 Table status changes: ${changes.total}`);
        console.log(`🔧 Data inconsistency fixes: ${dataFixCount}`);
        console.log(`⚡ Enhanced business logic actions: ${businessFixCount}`);
        console.log(`✨ Total actions performed: ${changes.total + dataFixCount + businessFixCount}`);
        
        if (changes.details.length > 0) {
            console.log('📝 Status change details:');
            changes.details.forEach(change => {
                console.log(`   • Table ${change.tableId}: ${change.from} → ${change.to}`);
            });
        }
        console.log(`===== ENHANCED AUTO-CHECK COMPLETED =====\n`);
    };

    // ... (tất cả handle functions giữ nguyên)

    const handleTablePress = (table) => {
        setSelectedTable(table.id);
        
        console.log('🔘 Table pressed:', {
            id: table.id,
            status: table.status,
            billId: table.bill?.id,
            billState: table.bill?.state,
            billVisit: table.bill?.visit,
            billTime: table.bill?.time,
            referenceTime: getCurrentReferenceTime().toLocaleString()
        });

        switch (table.status) {
            case 'occupied':
                handleOccupiedTable(table);
                break;
            case 'reserved':
                handleReservedTable(table);
                break;
            case 'ready':
                handleReadyTable(table);
                break;
            case 'empty':
            default:
                handleEmptyTable(table);
                break;
        }
    };

    const handleOccupiedTable = (table) => {
        const billTime = new Date(table.bill.time);
        const referenceTime = getCurrentReferenceTime();
        const minutesSinceBillTime = Math.floor((referenceTime.getTime() - billTime.getTime()) / (1000 * 60));

        Alert.alert(
            '🔴 Bàn đang có khách',
            `Bàn ${table.id} - ${table.bill.name || 'Khách hàng'}\n👥 ${table.bill.num_people} người\n⏰ Giờ đặt: ${billTime.toLocaleTimeString('vi-VN')}\n🕐 Đã sử dụng: ${minutesSinceBillTime} phút\n📋 Trạng thái: Đang phục vụ`,
            [
                { text: 'Hủy', style: 'cancel', onPress: () => setSelectedTable(null) },
                {
                    text: '✅ Check-out',
                    onPress: async () => {
                        try {
                            const result = await checkoutCustomer(table.bill.id);
                            if (result.success) {
                                Alert.alert('✅ Thành công', 'Đã checkout cho khách');
                                await refreshTableData();
                            } else {
                                Alert.alert('❌ Lỗi', result.msg || 'Không thể checkout');
                            }
                        } catch (error) {
                            Alert.alert('❌ Lỗi', 'Không thể checkout');
                        }
                        setSelectedTable(null);
                    }
                },
                {
                    text: '📄 Chi tiết',
                    onPress: () => {
                        router.push({
                            pathname: '/main/billDetailScr',
                            params: { billId: table.bill.id }
                        });
                        setSelectedTable(null);
                    }
                }
            ]
        );
    };

    const handleReservedTable = (table) => {
        const billTime = new Date(table.bill.time);
        const referenceTime = getCurrentReferenceTime();
        const minutesUntil = Math.floor((billTime.getTime() - referenceTime.getTime()) / (1000 * 60));
        
        Alert.alert(
            '🟠 Bàn đã được đặt',
            `Bàn ${table.id} đã được đặt cho:\n👤 ${table.bill.name || 'Khách hàng'}\n👥 ${table.bill.num_people} người\n⏰ Thời gian đặt: ${billTime.toLocaleTimeString('vi-VN')}\n⏳ Còn ${minutesUntil} phút nữa`,
            [
                { text: 'OK', onPress: () => setSelectedTable(null) },
                {
                    text: '❌ Hủy đặt',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const result = await cancelReservation(table.bill.id);
                            if (result.success) {
                                Alert.alert('✅ Thành công', 'Đã hủy đặt bàn');
                                await refreshTableData();
                            } else {
                                Alert.alert('❌ Lỗi', result.msg || 'Không thể hủy đặt bàn');
                            }
                        } catch (error) {
                            Alert.alert('❌ Lỗi', 'Không thể hủy đặt bàn');
                        }
                        setSelectedTable(null);
                    }
                },
                {
                    text: '📄 Chi tiết',
                    onPress: () => {
                        router.push({
                            pathname: '/main/billDetailScr',
                            params: { billId: table.bill.id }
                        });
                        setSelectedTable(null);
                    }
                }
            ]
        );
    };

    const handleReadyTable = (table) => {
        const billTime = new Date(table.bill.time);
        const referenceTime = getCurrentReferenceTime();
        const minutesLate = Math.floor((referenceTime.getTime() - billTime.getTime()) / (1000 * 60));

        Alert.alert(
            '🟡 Khách đã đến giờ',
            `Bàn ${table.id} - ${table.bill.name || 'Khách hàng'}\n👥 ${table.bill.num_people} người\n⏰ Giờ đặt: ${billTime.toLocaleTimeString('vi-VN')}\n⏳ Đã muộn: ${minutesLate} phút\n🎯 Sẵn sàng checkin!`,
            [
                { text: 'Hủy', style: 'cancel', onPress: () => setSelectedTable(null) },
                {
                    text: '✅ Check-in',
                    onPress: async () => {
                        try {
                            const result = await checkinCustomer(table.bill.id);
                            if (result.success) {
                                Alert.alert('✅ Thành công', 'Đã checkin cho khách');
                                await refreshTableData();
                            } else {
                                Alert.alert('❌ Lỗi', result.msg || 'Không thể checkin');
                            }
                        } catch (error) {
                            Alert.alert('❌ Lỗi', 'Không thể checkin');
                        }
                        setSelectedTable(null);
                    }
                },
                {
                    text: '📄 Chi tiết',
                    onPress: () => {
                        router.push({
                            pathname: '/main/billDetailScr',
                            params: { billId: table.bill.id }
                        });
                        setSelectedTable(null);
                    }
                }
            ]
        );
    };

    const handleEmptyTable = (table) => {
        Alert.alert(
            '🟢 Bàn trống',
            `Bàn số ${table.id} (Tầng ${table.floor}) đang trống.\n🎯 Sẵn sàng phục vụ khách mới!`,
            [
                { text: 'Hủy', style: 'cancel', onPress: () => setSelectedTable(null) },
                {
                    text: '➕ Tạo đơn mới',
                    onPress: () => {
                        router.push({
                            pathname: '/main/createBillScr',
                            params: { tableId: table.id }
                        });
                        setSelectedTable(null);
                    }
                }
            ]
        );
    };

    // ===================
    // RENDER FUNCTIONS
    // ===================

    const renderDateTimeControls = () => {
        return (
            <View style={styles.dateTimeControls}>
                <Pressable 
                    style={[styles.modeToggle, isLiveMode && styles.modeToggleActive]}
                    onPress={toggleLiveMode}
                >
                    <MaterialIcons 
                        name={isLiveMode ? "access-time" : "schedule"} 
                        size={16} 
                        color={isLiveMode ? 'white' : theme.colors.text} 
                    />
                    <Text style={[styles.modeToggleText, isLiveMode && styles.modeToggleTextActive]}>
                        {isLiveMode ? 'LIVE' : 'Tùy chỉnh'}
                    </Text>
                </Pressable>

                {!isLiveMode && (
                    <View style={styles.customTimeControls}>
                        <Pressable style={styles.dateTimeButton} onPress={() => setShowDatePicker(true)}>
                            <MaterialIcons name="calendar-today" size={16} color={theme.colors.text} />
                            <Text style={styles.dateTimeButtonText}>
                                {selectedDateTime.toLocaleDateString('vi-VN')}
                            </Text>
                        </Pressable>

                        <Pressable style={styles.dateTimeButton} onPress={() => setShowTimePicker(true)}>
                            <MaterialIcons name="access-time" size={16} color={theme.colors.text} />
                            <Text style={styles.dateTimeButtonText}>
                                {selectedDateTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    const renderFloorPage = (floor) => {
        const floorTables = getTablesByFloor(floor);
        const floorStats = {
            occupied: floorTables.filter(t => t.status === 'occupied').length,
            reserved: floorTables.filter(t => t.status === 'reserved').length,
            ready: floorTables.filter(t => t.status === 'ready').length,
            empty: floorTables.filter(t => t.status === 'empty').length
        };

        return (
            <View key={floor} style={styles.floorContainer}>
                <FlatList
                    data={floorTables}
                    renderItem={({ item }) => (
                        <MyTableItem
                            item={item}
                            tableClick={handleTablePress}
                            isSelected={selectedTable === item.id}
                        />
                    )}
                    numColumns={3}
                    key={`floor-${floor}-3cols`}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.tablesList}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[theme.colors.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyFloor}>
                            <MaterialIcons name="restaurant" size={60} color={theme.colors.textLight} />
                            <Text style={styles.emptyFloorText}>
                                Tầng {floor} chưa có bàn nào
                            </Text>
                        </View>
                    }
                    ListHeaderComponent={
                        <View style={styles.floorStats}>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNumber, { color: '#ff4757' }]}>
                                    {floorStats.occupied}
                                </Text>
                                <Text style={styles.statLabel}>Có khách</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNumber, { color: '#ffa502' }]}>
                                    {floorStats.reserved}
                                </Text>
                                <Text style={styles.statLabel}>Đã đặt</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNumber, { color: '#ff6b6b' }]}>
                                    {floorStats.ready}
                                </Text>
                                <Text style={styles.statLabel}>Sẵn sàng</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={[styles.statNumber, { color: '#2ed573' }]}>
                                    {floorStats.empty}
                                </Text>
                                <Text style={styles.statLabel}>Trống</Text>
                            </View>
                        </View>
                    }
                />
            </View>
        );
    };

    // ===================
    // MAIN RENDER
    // ===================

    if (loading) {
        return (
            <ScreenWrapper bg={'#FFBF00'}>
                <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                    <MaterialIcons name="restaurant" size={60} color={theme.colors.text} />
                    <Text style={styles.loadingText}>Đang tải dữ liệu bàn...</Text>
                    <Text style={styles.loadingSubText}>Áp dụng logic mới (10 phút + 30 phút)</Text>
                </View>
            </ScreenWrapper>
        );
    }

    const upcomingTables = getUpcomingTablesWithCustomTime();
    const statusCounts = getStatusCounts();
    const activeTablesInfo = getActiveTablesInfo();

    return (
        <ScreenWrapper bg={'#FFBF00'}>
            <View style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <MyBackButton />
                    <View style={styles.titleContainer}>
                        <Text style={styles.title}>Quản lý bàn</Text>
                        <View style={styles.realtimeIndicator}>
                            <View style={[styles.realtimeDot, { backgroundColor: isLiveMode ? '#2ecc71' : '#f39c12' }]} />
                            <Text style={[styles.realtimeText, { color: isLiveMode ? '#2ecc71' : '#f39c12' }]}>
                                {isLiveMode ? 'Smart Auto-Check' : 'Custom Time Mode'}
                            </Text>
                            {isLiveMode && (
                                <Text style={styles.autoCheckText}>
                                    {formatLastCheck()} • {autoCheckStatus || 'Hoạt động'}
                                </Text>
                            )}
                        </View>
                    </View>
                    <View style={styles.headerButtons}>
                        <Pressable style={styles.autoCheckButton} onPress={manualAutoCheck}>
                            <MaterialIcons name="assignment-turned-in" size={20} color={theme.colors.text} />
                        </Pressable>
                        <Pressable style={styles.refreshButton} onPress={onRefresh}>
                            <MaterialIcons name="refresh" size={24} color={theme.colors.text} />
                        </Pressable>
                    </View>
                </View>

                {/* DateTime Controls */}
                {renderDateTimeControls()}

                {/* DateTime Pickers */}
                {showDatePicker && (
                    <DateTimePicker
                        value={selectedDateTime}
                        mode="date"
                        display="default"
                        onChange={onDateChange}
                    />
                )}
                {showTimePicker && (
                    <DateTimePicker
                        value={selectedDateTime}
                        mode="time"
                        display="default"
                        onChange={onTimeChange}
                    />
                )}

                {/* Upcoming Alert (chỉ trong 10 phút) */}
                {upcomingTables.length > 0 && (
                    <View style={styles.upcomingAlert}>
                        <MaterialIcons name="notification-important" size={16} color="#ff6b6b" />
                        <Text style={styles.upcomingText}>
                            🔔 {upcomingTables.length} đặt bàn trong 10 phút tới ({formatSelectedDateTime()})
                        </Text>
                    </View>
                )}

                {/* Enhanced Global Stats */}
                <View style={styles.globalStats}>
                    <Text style={styles.globalStatsText}>
                        📊 Tại {formatSelectedDateTime()}: {statusCounts.occupied + statusCounts.reserved + statusCounts.ready} hoạt động / {statusCounts.total} bàn
                    </Text>
                    {(statusChanges > 0 || dataFixes > 0 || businessFixes > 0) && isLiveMode && (
                        <Text style={styles.changesText}>
                            🔄 Lần check cuối: {statusChanges} thay đổi, {dataFixes + businessFixes} sửa lỗi
                        </Text>
                    )}
                    {!isLiveMode && (
                        <Text style={styles.customModeText}>
                            ⏰ Chế độ tùy chỉnh: Hiển thị đặt bàn trong 10 phút tới, occupied ≤ 30 phút
                        </Text>
                    )}
                </View>

                {/* Floor Tabs */}
                <View style={styles.floorTabsContainer}>
                    <FlatList
                        data={floors}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item: floor, index }) => {
                            const floorTables = getTablesByFloor(floor);
                            const activeCount = floorTables.filter(t => 
                                t.status === 'occupied' || t.status === 'reserved' || t.status === 'ready'
                            ).length;
                            
                            return (
                                <Pressable
                                    style={[
                                        styles.floorTab,
                                        currentFloor === index && styles.activeFloorTab
                                    ]}
                                    onPress={() => {
                                        setCurrentFloor(index);
                                        pagerRef.current?.setPage(index);
                                        setSelectedTable(null);
                                    }}
                                >
                                    <Text style={[
                                        styles.floorTabText,
                                        currentFloor === index && styles.activeFloorTabText
                                    ]}>
                                        Tầng {floor}
                                    </Text>
                                    <Text style={[
                                        styles.floorTabCount,
                                        currentFloor === index && styles.activeFloorTabCount
                                    ]}>
                                        {activeCount}/{floorTables.length} hoạt động
                                    </Text>
                                </Pressable>
                            );
                        }}
                        keyExtractor={(item) => item.toString()}
                        contentContainerStyle={styles.floorTabsList}
                    />
                </View>

                {/* Tables Container */}
                <View style={styles.tablesContainer}>
                    <PagerView
                        ref={pagerRef}
                        style={styles.pagerView}
                        initialPage={0}
                        onPageSelected={(e) => {
                            setCurrentFloor(e.nativeEvent.position);
                            setSelectedTable(null);
                        }}
                    >
                        {floors.map(floor => (
                            <View key={floor} style={styles.pageView}>
                                {renderFloorPage(floor)}
                            </View>
                        ))}
                    </PagerView>
                </View>

                {/* Enhanced Status Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#ff4757' }]} />
                        <Text style={styles.legendText}>Có khách (≤30p)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#ffa502' }]} />
                        <Text style={styles.legendText}>Đặt bàn (10p)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#ff6b6b' }]} />
                        <Text style={styles.legendText}>Sẵn sàng</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#2ed573' }]} />
                        <Text style={styles.legendText}>Trống</Text>
                    </View>
                </View>
            </View>
        </ScreenWrapper>
    );
};

export default tableManageScr;

// ===================
// ENHANCED STYLES
// ===================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: wp(4),
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    titleContainer: {
        alignItems: 'center',
    },
    title: {
        fontSize: hp(2.5),
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    realtimeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    realtimeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    realtimeText: {
        fontSize: 10,
        fontWeight: '600',
    },
    autoCheckText: {
        fontSize: 9,
        color: '#666',
        marginLeft: 4,
    },
    headerButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    autoCheckButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    refreshButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    
    // DateTime Controls
    dateTimeControls: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modeToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        gap: 6,
    },
    modeToggleActive: {
        backgroundColor: theme.colors.primary,
    },
    modeToggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.text,
    },
    modeToggleTextActive: {
        color: 'white',
    },
    customTimeControls: {
        flexDirection: 'row',
        gap: 10,
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#f8f9fa',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        gap: 6,
    },
    dateTimeButtonText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '500',
    },
    
    upcomingAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#ff6b6b',
    },
    upcomingText: {
        fontSize: 12,
        color: '#ff6b6b',
        fontWeight: '600',
        marginLeft: 8,
    },
    globalStats: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 15,
        alignItems: 'center',
    },
    globalStatsText: {
        fontSize: 12,
        color: theme.colors.text,
        fontWeight: '600',
    },
    changesText: {
        fontSize: 10,
        color: '#ff6b6b',
        fontWeight: '500',
        marginTop: 2,
    },
    customModeText: {
        fontSize: 10,
        color: '#f39c12',
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'center',
    },
    floorTabsContainer: {
        marginBottom: 15,
    },
    floorTabsList: {
        paddingHorizontal: 5,
    },
    floorTab: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginHorizontal: 5,
        borderRadius: 16,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        alignItems: 'center',
        minWidth: 120,
    },
    activeFloorTab: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    floorTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    activeFloorTabText: {
        color: 'white',
    },
    floorTabCount: {
        fontSize: 9,
        color: theme.colors.textLight,
        marginTop: 2,
        textAlign: 'center',
    },
    activeFloorTabCount: {
        color: 'rgba(255,255,255,0.9)',
    },
    tablesContainer: {
        flex: 1,
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
    },
    pagerView: {
        flex: 1,
    },
    pageView: {
        flex: 1,
    },
    floorContainer: {
        flex: 1,
        paddingTop: 10,
    },
    floorStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        paddingHorizontal: 15,
        backgroundColor: '#f8f9fa',
        marginBottom: 10,
        marginHorizontal: 15,
        borderRadius: 12,
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 11,
        color: theme.colors.textLight,
        marginTop: 2,
        textAlign: 'center',
    },
    tablesList: {
        paddingHorizontal: 10,
        paddingBottom: 20,
    },
    emptyFloor: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyFloorText: {
        fontSize: 16,
        color: theme.colors.textLight,
        marginTop: 15,
        textAlign: 'center',
    },
    legend: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 15,
        gap: 15,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 14,
        height: 14,
        borderRadius: 7,
    },
    legendText: {
        fontSize: 11,
        color: theme.colors.text,
        fontWeight: '500',
    },
    loadingText: {
        fontSize: 18,
        color: theme.colors.text,
        fontWeight: '600',
        marginTop: 15,
        textAlign: 'center',
    },
    loadingSubText: {
        fontSize: 14,
        color: theme.colors.textLight,
        marginTop: 5,
        textAlign: 'center',
    },
});