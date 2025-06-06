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
 * Lấy bills theo năm - THÊM MỚI
 * @param {Date} date - Ngày trong năm cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByYear = async (date) => {
    const startDate = new Date(date.getFullYear(), 0, 1, 0, 0, 0); // 1/1/year
    const endDate = new Date(date.getFullYear(), 11, 31, 23, 59, 59); // 31/12/year

    return await getBillsInDateRange(startDate.toISOString(), endDate.toISOString());
};

/**
 * Lấy bills theo loại báo cáo - SỬA LẠI
 * @param {string} reportType - 'daily', 'weekly', 'monthly', 'yearly'
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
        case 'yearly':
            return await getBillsByYear(selectedDate);
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
 * Format date range cho display - SỬA LẠI
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

        case 'yearly':
            return `Năm ${date.getFullYear()}`;

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

// ...existing code... (giữ nguyên các hàm khác)
export const createBill = async (bill) => {
    try {
        console.log('createBill input:', bill);

        const { data, error } = await supabase
            .from('bills')
            .insert([bill])
            .select();

        console.log('createBill response:', { data, error });

        if (error) {
            console.log('createBill error details: ', error);
            return { success: false, msg: error.message || 'Không thể đặt bàn' };
        }
        return { success: true, data };
    } catch (error) {
        console.log('createBill catch error: ', error);
        return { success: false, msg: error.message || 'Không thể đặt bàn' };
    }
};

export const fetchBill = async () => {
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('fetchBill error: ', error);
            return { success: false, msg: 'Không thể lấy dữ liệu đặt bàn' };
        }
        return { success: true, data: data };
    } catch (error) {
        console.log('fetchBill error: ', error);
        return { success: false, msg: 'Không thể lấy dữ liệu đặt bàn' };
    }
}

export const fetchBillByTimeRange = async (time) => {
    try {
        const targetDateTime = new Date(time);

        const startTime = new Date(targetDateTime.getTime() - 15 * 60 * 1000);
        const endTime = new Date(targetDateTime.getTime() + 15 * 60 * 1000);

        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .gte('time', startTime.toISOString())
            .lte('time', endTime.toISOString())
            .order('time', { ascending: true });

        if (error) {
            console.log('fetchBillByTimeRange error: ', error);
            return { success: false, msg: 'Không thể lấy dữ liệu đặt bàn theo thời gian' };
        }

        return { success: true, data };
    } catch (error) {
        console.log('fetchBillByTimeRange error: ', error);
        return { success: false, msg: 'Có lỗi xảy ra khi lấy dữ liệu đặt bàn' };
    }
};

// detail
export const fetchDetailByBillIds = async (billIds) => {
    try {
        const { data, error } = await supabase
            .from('detailBills')
            .select('*')
            .in('billId', billIds);

        if (error) {
            console.log('fetchDetailByBillIds error: ', error);
            return { success: false, msg: 'Không thể lấy chi tiết bill' };
        }
        return { success: true, data };
    } catch (error) {
        console.log('fetchDetailByBillIds error: ', error);
        return { success: false, msg: 'Có lỗi xảy ra khi lấy chi tiết bill' };
    }
};
export const createDetail = async (billId, tableIds, peopleCount) => {
    try {
        let details = [];
        let remainingPeople = peopleCount;
        let tableIndex = 0;

        while (remainingPeople > 0 && tableIndex < tableIds.length) {
            const currentTableId = tableIds[tableIndex];

            const peopleForThisTable = Math.min(remainingPeople, 6);

            const detailsNeeded = Math.ceil(peopleForThisTable / 6);

            for (let i = 0; i < detailsNeeded; i++) {
                details.push({
                    billId,
                    tableId: currentTableId,
                });
            }

            remainingPeople -= peopleForThisTable;
            tableIndex++;
        }

        const { data, error } = await supabase
            .from('detailBills')
            .insert(details)
            .select();

        if (error) {
            console.log('createDetail error: ', error);
            return { success: false, msg: 'Không thể tạo chi tiết bill' };
        }
        return { success: true, data };
    } catch (error) {
        console.log('createDetail error: ', error);
        return { success: false, msg: 'Có lỗi xảy ra khi tạo chi tiết bill' };
    }
};
export const fetchBillByUser = async (userId) => {
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('userId', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.log('fetchBillByUser error: ', error);
            return { success: false, msg: 'Không thể lấy dữ liệu bill của user' };
        }
        return { success: true, data };
    } catch (error) {
        console.log('fetchBillByUser error: ', error);
        return { success: false, msg: 'Có lỗi xảy ra khi lấy bill của user' };
    }
};