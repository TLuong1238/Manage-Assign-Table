import { supabase } from '../lib/supabase';

// ===================
// BILL DATA QUERIES
// ===================

/**
 * Lấy tất cả bills trong khoảng thời gian
 * @param {Date} startDate - Ngày bắt đầu
 * @param {Date} endDate - Ngày kết thúc
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsInDateRange = async (startDate, endDate) => {
    try {
        console.log(`📊 Fetching bills from ${startDate} to ${endDate}`);
        
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .gte('created_at', startDate)
            .lte('created_at', endDate)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching bills:', error);
            return { 
                success: false, 
                msg: `Lỗi tải dữ liệu: ${error.message}` 
            };
        }

        console.log(`✅ Successfully fetched ${data?.length || 0} bills`);
        return { 
            success: true, 
            data: data || [] 
        };

    } catch (error) {
        console.error('❌ Unexpected error in getBillsInDateRange:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tải dữ liệu' 
        };
    }
};

/**
 * Lấy bills theo ngày cụ thể
 * @param {Date} date - Ngày cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByDate = async (date) => {
    const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
    
    return await getBillsInDateRange(startDate.toISOString(), endDate.toISOString());
};

/**
 * Lấy bills theo tuần
 * @param {Date} date - Ngày trong tuần cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByWeek = async (date) => {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return await getBillsInDateRange(weekStart.toISOString(), weekEnd.toISOString());
};

/**
 * Lấy bills theo tháng
 * @param {Date} date - Ngày trong tháng cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByMonth = async (date) => {
    const startDate = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0);
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    
    return await getBillsInDateRange(startDate.toISOString(), endDate.toISOString());
};

/**
 * Lấy bills theo loại báo cáo
 * @param {string} reportType - 'daily', 'weekly', 'monthly'
 * @param {Date} selectedDate - Ngày được chọn
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByReportType = async (reportType, selectedDate) => {
    console.log(`📊 Fetching bills for ${reportType} report on ${selectedDate.toDateString()}`);
    
    switch (reportType) {
        case 'daily':
            return await getBillsByDate(selectedDate);
        case 'weekly':
            return await getBillsByWeek(selectedDate);
        case 'monthly':
            return await getBillsByMonth(selectedDate);
        default:
            return await getBillsByDate(selectedDate);
    }
};

// ===================
// STATISTICS CALCULATION
// ===================

/**
 * Tính toán thống kê cơ bản từ danh sách bills
 * @param {Array} bills - Danh sách bills
 * @returns {Object} Thống kê cơ bản
 */
export const calculateBasicStats = (bills) => {
    const totalBills = bills.length;
    const completedBills = bills.filter(bill => bill.state === 'completed');
    const cancelledBills = bills.filter(bill => bill.state === 'cancelled');
    const inOrderBills = bills.filter(bill => bill.state === 'in_order');
    
    return {
        totalBills,
        completedBills: completedBills.length,
        cancelledBills: cancelledBills.length,
        inOrderBills: inOrderBills.length,
        completedBillsData: completedBills,
        cancelledBillsData: cancelledBills,
        inOrderBillsData: inOrderBills
    };
};

/**
 * Tính toán thống kê doanh thu
 * @param {Array} completedBills - Danh sách bills đã hoàn thành
 * @returns {Object} Thống kê doanh thu
 */
export const calculateRevenueStats = (completedBills) => {
    const totalRevenue = completedBills.reduce((sum, bill) => sum + (bill.price || 0), 0);
    const avgOrderValue = completedBills.length > 0 ? totalRevenue / completedBills.length : 0;
    
    const totalCustomers = completedBills.reduce((sum, bill) => sum + (bill.num_people || 0), 0);
    const avgPartySize = completedBills.length > 0 ? totalCustomers / completedBills.length : 0;
    
    return {
        totalRevenue,
        avgOrderValue,
        totalCustomers,
        avgPartySize
    };
};

/**
 * Tính toán thống kê visit
 * @param {Array} bills - Danh sách tất cả bills
 * @returns {Object} Thống kê visit
 */
export const calculateVisitStats = (bills) => {
    const checkedInBills = bills.filter(bill => 
        bill.visit === 'in_process' || bill.visit === 'visited'
    );
    const noShowBills = bills.filter(bill => 
        bill.state === 'cancelled' && bill.visit === 'un_visited'
    );
    
    const totalBills = bills.length;
    const checkInRate = totalBills > 0 ? (checkedInBills.length / totalBills * 100) : 0;
    const noShowRate = totalBills > 0 ? (noShowBills.length / totalBills * 100) : 0;
    
    return {
        checkedInBills: checkedInBills.length,
        noShowBills: noShowBills.length,
        checkInRate,
        noShowRate
    };
};

/**
 * Phân tích patterns theo thời gian
 * @param {Array} bills - Danh sách bills
 * @returns {Object} Thống kê thời gian
 */
export const analyzeTimePatterns = (bills) => {
    if (bills.length === 0) {
        return {
            timeSlots: {
                morning: 0,
                lunch: 0,
                afternoon: 0,
                dinner: 0,
                night: 0
            },
            peakTime: { time: '', count: 0 }
        };
    }
    
    const timeSlots = {
        morning: 0,    // 6-11
        lunch: 0,      // 11-14
        afternoon: 0,  // 14-17
        dinner: 0,     // 17-22
        night: 0       // 22-6
    };
    
    bills.forEach(bill => {
        const hour = new Date(bill.time || bill.created_at).getHours();
        
        if (hour >= 6 && hour < 11) timeSlots.morning++;
        else if (hour >= 11 && hour < 14) timeSlots.lunch++;
        else if (hour >= 14 && hour < 17) timeSlots.afternoon++;
        else if (hour >= 17 && hour < 22) timeSlots.dinner++;
        else timeSlots.night++;
    });
    
    // Tìm peak time
    const peakTime = Object.entries(timeSlots).reduce((peak, [time, count]) => 
        count > peak.count ? { time, count } : peak, { time: '', count: 0 }
    );
    
    return { timeSlots, peakTime };
};

/**
 * Phân tích phân bố theo giờ
 * @param {Array} bills - Danh sách bills
 * @returns {Array} Mảng 24 phần tử thể hiện số bills theo giờ
 */
export const analyzeHourlyDistribution = (bills) => {
    const hours = Array(24).fill(0);
    
    bills.forEach(bill => {
        const hour = new Date(bill.time || bill.created_at).getHours();
        if (hour >= 0 && hour < 24) {
            hours[hour]++;
        }
    });
    
    return hours;
};

/**
 * Tính toán toàn bộ thống kê
 * @param {Array} bills - Danh sách bills
 * @returns {Object} Tất cả thống kê
 */
export const calculateAllStats = (bills) => {
    console.log(`📊 Calculating stats for ${bills.length} bills`);
    
    // Basic stats
    const basicStats = calculateBasicStats(bills);
    
    // Revenue stats (chỉ từ completed bills)
    const revenueStats = calculateRevenueStats(basicStats.completedBillsData);
    
    // Visit stats
    const visitStats = calculateVisitStats(bills);
    
    // Time analysis
    const timeStats = analyzeTimePatterns(bills);
    const hourlyStats = analyzeHourlyDistribution(bills);
    
    const allStats = {
        ...basicStats,
        ...revenueStats,
        ...visitStats,
        ...timeStats,
        hourlyStats
    };
    
    console.log('✅ Stats calculation completed:', {
        totalBills: allStats.totalBills,
        totalRevenue: allStats.totalRevenue,
        checkInRate: allStats.checkInRate.toFixed(1) + '%',
        peakTime: allStats.peakTime
    });
    
    return allStats;
};

// ===================
// REPORT HELPERS
// ===================

/**
 * Format date range cho display
 * @param {string} reportType - Loại báo cáo
 * @param {Date} selectedDate - Ngày được chọn
 * @returns {string} Date range formatted
 */
export const formatDateRange = (reportType, selectedDate) => {
    const date = new Date(selectedDate);
    
    switch (reportType) {
        case 'daily':
            return date.toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            
        case 'weekly':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            return `${weekStart.toLocaleDateString('vi-VN')} - ${weekEnd.toLocaleDateString('vi-VN')}`;
            
        case 'monthly':
            return date.toLocaleDateString('vi-VN', {
                year: 'numeric',
                month: 'long'
            });
            
        default:
            return date.toLocaleDateString('vi-VN');
    }
};

// ===================
// REAL-TIME SUBSCRIPTIONS
// ===================

/**
 * Setup realtime subscription cho bills
 * @param {Function} onBillChange - Callback khi có thay đổi
 * @returns {Function} Cleanup function
 */
export const subscribeToBills = (onBillChange) => {
    console.log('📡 Setting up bills realtime subscription');
    
    const channel = supabase
        .channel('bills-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bills'
        }, (payload) => {
            console.log('💫 Bills change detected:', payload.eventType, payload.new?.id || payload.old?.id);
            onBillChange(payload);
        })
        .subscribe();

    // Return cleanup function
    return () => {
        console.log('🧹 Cleaning up bills subscription');
        supabase.removeChannel(channel);
    };
};