
// ===================
// CONSTANTS & ENUMS

import { supabase } from "../../lib/supabase";

// ===================
export const BILL_STATES = {
    IN_ORDER: 'in_order',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

export const VISIT_STATUSES = {
    UN_VISITED: 'un_visited',
    ON_PROCESS: 'on_process',
    VISITED: 'visited'
};

export const TIME_SLOTS = {
    MORNING: 'morning',    // 6-11
    LUNCH: 'lunch',        // 11-14
    AFTERNOON: 'afternoon', // 14-17
    DINNER: 'dinner',      // 17-22
    NIGHT: 'night'         // 22-6
};

// ===================
// UTILITY FUNCTIONS
// ===================

/**
 * Log formatted message
 * @param {string} level - Log level (info, error, warn)
 * @param {string} message - Message to log
 * @param {any} data - Additional data
 */
const logMessage = (level, message, data = null) => {
    const emoji = {
        info: '📋',
        error: '❌',
        warn: '⚠️',
        success: '✅'
    };
    
    const prefix = `${emoji[level] || '📋'} [BillService]`;
    
    if (data) {
        console.log(`${prefix} ${message}`, data);
    } else {
        console.log(`${prefix} ${message}`);
    }
};

/**
 * Handle Supabase errors
 * @param {Object} error - Supabase error object
 * @param {string} operation - Operation being performed
 * @returns {Object} Formatted error response
 */
const handleSupabaseError = (error, operation) => {
    logMessage('error', `${operation} failed:`, error);
    
    let message = 'Có lỗi xảy ra, vui lòng thử lại';
    
    if (error.code === 'PGRST116') {
        message = 'Không tìm thấy dữ liệu';
    } else if (error.code === 'PGRST301') {
        message = 'Dữ liệu không hợp lệ';
    } else if (error.message) {
        message = error.message;
    }
    
    return {
        success: false,
        msg: message,
        error: error
    };
};

/**
 * Validate bill data
 * @param {Object} billData - Bill data to validate
 * @returns {Object} Validation result
 */
const validateBillData = (billData) => {
    const errors = [];
    
    if (!billData) {
        errors.push('Dữ liệu bill không được để trống');
        return { isValid: false, errors };
    }
    
    if (!billData.table_id || isNaN(parseInt(billData.table_id))) {
        errors.push('Table ID không hợp lệ');
    }
    
    if (!billData.name || typeof billData.name !== 'string' || billData.name.trim().length === 0) {
        errors.push('Tên khách hàng không được để trống');
    }
    
    if (!billData.num_people || isNaN(parseInt(billData.num_people)) || parseInt(billData.num_people) <= 0) {
        errors.push('Số người phải lớn hơn 0');
    }
    
    if (!billData.time) {
        errors.push('Thời gian đặt bàn không được để trống');
    } else {
        const billTime = new Date(billData.time);
        if (isNaN(billTime.getTime())) {
            errors.push('Thời gian đặt bàn không hợp lệ');
        }
    }
    
    if (billData.price !== undefined && (isNaN(parseFloat(billData.price)) || parseFloat(billData.price) < 0)) {
        errors.push('Giá tiền không hợp lệ');
    }
    
    if (billData.state && !Object.values(BILL_STATES).includes(billData.state)) {
        errors.push('Trạng thái bill không hợp lệ');
    }
    
    if (billData.visit && !Object.values(VISIT_STATUSES).includes(billData.visit)) {
        errors.push('Trạng thái visit không hợp lệ');
    }
    
    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * Clean bill data
 * @param {Object} billData - Raw bill data
 * @returns {Object} Cleaned bill data
 */
const cleanBillData = (billData) => {
    return {
        table_id: parseInt(billData.table_id),
        name: billData.name?.trim() || '',
        num_people: parseInt(billData.num_people) || 1,
        time: billData.time,
        price: parseFloat(billData.price) || 0,
        state: billData.state || BILL_STATES.IN_ORDER,
        visit: billData.visit || VISIT_STATUSES.ON_PROCESS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

// ===================
// BILL CRUD OPERATIONS
// ===================

/**
 * Tạo bill mới
 * @param {Object} billData - Dữ liệu bill
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const createBill = async (billData) => {
    try {
        logMessage('info', 'Creating new bill:', billData);
        
        // Validate data
        const validation = validateBillData(billData);
        if (!validation.isValid) {
            return {
                success: false,
                msg: validation.errors[0]
            };
        }

        // Clean data
        const cleanData = cleanBillData(billData);

        const { data, error } = await supabase
            .from('bills')
            .insert([cleanData])
            .select()
            .single();

        if (error) {
            return handleSupabaseError(error, 'Create bill');
        }

        logMessage('success', `Bill created with ID: ${data.id}`);
        return { 
            success: true, 
            data: data,
            msg: 'Tạo bill thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in createBill:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tạo bill' 
        };
    }
};

/**
 * Cập nhật bill
 * @param {number} billId - ID của bill
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const updateBill = async (billId, updateData) => {
    try {
        logMessage('info', `Updating bill ${billId}:`, updateData);
        
        if (!billId) {
            return {
                success: false,
                msg: 'Bill ID không hợp lệ'
            };
        }

        // Clean update data và thêm updated_at
        const cleanData = Object.fromEntries(
            Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );
        cleanData.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('bills')
            .update(cleanData)
            .eq('id', billId)
            .select()
            .single();

        if (error) {
            return handleSupabaseError(error, 'Update bill');
        }

        logMessage('success', `Bill ${billId} updated successfully`);
        return { 
            success: true, 
            data: data,
            msg: 'Cập nhật bill thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in updateBill:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi cập nhật bill' 
        };
    }
};

/**
 * Lấy bill theo ID
 * @param {number} billId - ID của bill
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const getBillById = async (billId) => {
    try {
        logMessage('info', `Fetching bill ${billId}`);
        
        if (!billId) {
            return {
                success: false,
                msg: 'Bill ID không hợp lệ'
            };
        }

        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .eq('id', billId)
            .single();

        if (error) {
            return handleSupabaseError(error, 'Get bill by ID');
        }

        logMessage('success', `Bill ${billId} fetched successfully`);
        return { 
            success: true, 
            data: data 
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in getBillById:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi lấy bill' 
        };
    }
};

/**
 * Xóa bill (soft delete)
 * @param {number} billId - ID của bill
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const deleteBill = async (billId) => {
    try {
        logMessage('info', `Soft deleting bill ${billId}`);
        
        if (!billId) {
            return {
                success: false,
                msg: 'Bill ID không hợp lệ'
            };
        }

        const { error } = await supabase
            .from('bills')
            .update({ 
                state: BILL_STATES.CANCELLED,
                visit: VISIT_STATUSES.UN_VISITED,
                updated_at: new Date().toISOString()
            })
            .eq('id', billId);

        if (error) {
            return handleSupabaseError(error, 'Delete bill');
        }

        logMessage('success', `Bill ${billId} deleted successfully`);
        return { 
            success: true, 
            msg: 'Xóa bill thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in deleteBill:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi xóa bill' 
        };
    }
};

/**
 * Xóa vĩnh viễn bill (hard delete)
 * @param {number} billId - ID của bill
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const hardDeleteBill = async (billId) => {
    try {
        logMessage('info', `Hard deleting bill ${billId}`);
        
        if (!billId) {
            return {
                success: false,
                msg: 'Bill ID không hợp lệ'
            };
        }

        const { error } = await supabase
            .from('bills')
            .delete()
            .eq('id', billId);

        if (error) {
            return handleSupabaseError(error, 'Hard delete bill');
        }

        logMessage('success', `Bill ${billId} hard deleted successfully`);
        return { 
            success: true, 
            msg: 'Xóa vĩnh viễn bill thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in hardDeleteBill:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi xóa vĩnh viễn bill' 
        };
    }
};

// ===================
// BILL STATUS OPERATIONS
// ===================

/**
 * Cập nhật trạng thái bill
 * @param {number} billId - ID của bill
 * @param {string} state - Trạng thái mới
 * @param {string} visit - Trạng thái visit
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const updateBillStatus = async (billId, state, visit) => {
    try {
        logMessage('info', `Updating bill ${billId} status: state=${state}, visit=${visit}`);
        
        if (!billId || !state || !visit) {
            return {
                success: false,
                msg: 'Thiếu thông tin bắt buộc: billId, state, visit'
            };
        }

        // Validate states
        if (!Object.values(BILL_STATES).includes(state)) {
            return {
                success: false,
                msg: `Trạng thái bill không hợp lệ: ${state}`
            };
        }

        if (!Object.values(VISIT_STATUSES).includes(visit)) {
            return {
                success: false,
                msg: `Trạng thái visit không hợp lệ: ${visit}`
            };
        }

        const { data, error } = await supabase
            .from('bills')
            .update({ 
                state: state,
                visit: visit,
                updated_at: new Date().toISOString()
            })
            .eq('id', billId)
            .select()
            .single();

        if (error) {
            return handleSupabaseError(error, 'Update bill status');
        }

        logMessage('success', `Bill ${billId} status updated successfully`);
        return { 
            success: true, 
            data: data,
            msg: 'Cập nhật trạng thái thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in updateBillStatus:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi cập nhật trạng thái' 
        };
    }
};

/**
 * Cập nhật giá bill
 * @param {number} billId - ID của bill
 * @param {number} newPrice - Giá mới
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const updateBillPrice = async (billId, newPrice) => {
    try {
        logMessage('info', `Updating bill ${billId} price to ${newPrice}`);
        
        if (!billId || newPrice < 0) {
            return {
                success: false,
                msg: 'Bill ID hoặc giá không hợp lệ'
            };
        }

        const { error } = await supabase
            .from('bills')
            .update({ 
                price: parseFloat(newPrice),
                updated_at: new Date().toISOString()
            })
            .eq('id', billId);

        if (error) {
            return handleSupabaseError(error, 'Update bill price');
        }

        logMessage('success', `Bill ${billId} price updated successfully`);
        return { 
            success: true, 
            msg: 'Cập nhật giá thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in updateBillPrice:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi cập nhật giá' 
        };
    }
};

// ===================
// BILL QUERIES
// ===================

/**
 * Lấy tất cả bills
 * @param {Object} options - Query options
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getAllBills = async (options = {}) => {
    try {
        logMessage('info', 'Fetching all bills with options:', options);
        
        let query = supabase.from('bills').select('*');
        
        // Apply filters
        if (options.state) {
            query = query.eq('state', options.state);
        }
        
        if (options.visit) {
            query = query.eq('visit', options.visit);
        }
        
        if (options.table_id) {
            query = query.eq('table_id', options.table_id);
        }
        
        // Apply date range
        if (options.startDate) {
            query = query.gte('time', options.startDate);
        }
        
        if (options.endDate) {
            query = query.lte('time', options.endDate);
        }
        
        // Apply ordering
        const orderBy = options.orderBy || 'time';
        const ascending = options.ascending !== false;
        query = query.order(orderBy, { ascending });
        
        // Apply pagination
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        if (options.offset) {
            query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
        }

        const { data, error } = await query;

        if (error) {
            return handleSupabaseError(error, 'Get all bills');
        }

        logMessage('success', `Fetched ${data?.length || 0} bills`);
        return { 
            success: true, 
            data: data || [] 
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in getAllBills:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tải bills' 
        };
    }
};

/**
 * Lấy bills trong khoảng thời gian
 * @param {string|Date} startDate - Ngày bắt đầu
 * @param {string|Date} endDate - Ngày kết thúc
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsInDateRange = async (startDate, endDate) => {
    try {
        const start = typeof startDate === 'string' ? startDate : startDate.toISOString();
        const end = typeof endDate === 'string' ? endDate : endDate.toISOString();
        
        logMessage('info', `Fetching bills from ${start} to ${end}`);
        
        return await getAllBills({
            startDate: start,
            endDate: end,
            orderBy: 'time',
            ascending: false
        });

    } catch (error) {
        logMessage('error', 'Unexpected error in getBillsInDateRange:', error);
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
    const targetDate = new Date(date);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);
    
    return await getBillsInDateRange(startDate, endDate);
};

/**
 * Lấy bills theo tuần
 * @param {Date} date - Ngày trong tuần cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByWeek = async (date) => {
    const targetDate = new Date(date);
    const weekStart = new Date(targetDate);
    weekStart.setDate(targetDate.getDate() - targetDate.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return await getBillsInDateRange(weekStart, weekEnd);
};

/**
 * Lấy bills theo tháng
 * @param {Date} date - Ngày trong tháng cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByMonth = async (date) => {
    const targetDate = new Date(date);
    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 0, 0, 0);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);
    
    return await getBillsInDateRange(startDate, endDate);
};

/**
 * Lấy bills theo khoảng thời gian (cho assignTableScr)
 * @param {Date} targetTime - Thời gian mục tiêu
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const fetchBillByTimeRange = async (targetTime) => {
    try {
        const startDate = new Date(targetTime);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(targetTime);
        endDate.setHours(23, 59, 59, 999);
        
        logMessage('info', `Fetching bills for time range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
        
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .gte('time', startDate.toISOString())
            .lte('time', endDate.toISOString())
            .order('time', { ascending: true });

        if (error) {
            return handleSupabaseError(error, 'Fetch bills by time range');
        }

        logMessage('success', `Successfully fetched ${data?.length || 0} bills by time range`);
        return { 
            success: true, 
            data: data || [] 
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in fetchBillByTimeRange:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tải dữ liệu' 
        };
    }
};

/**
 * Lấy bills theo table ID
 * @param {number} tableId - ID của bàn
 * @param {Date} [date=today] - Ngày cần lấy
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByTableId = async (tableId, date = new Date()) => {
    try {
        logMessage('info', `Fetching bills for table ${tableId} on ${date.toDateString()}`);
        
        if (!tableId) {
            return {
                success: false,
                msg: 'Table ID không hợp lệ'
            };
        }

        const targetDate = new Date(date);
        const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59);

        return await getAllBills({
            table_id: tableId,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            orderBy: 'time',
            ascending: false
        });

    } catch (error) {
        logMessage('error', 'Unexpected error in getBillsByTableId:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tải bills' 
        };
    }
};

/**
 * Lấy bills theo loại báo cáo
 * @param {string} reportType - 'daily', 'weekly', 'monthly'
 * @param {Date} selectedDate - Ngày được chọn
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getBillsByReportType = async (reportType, selectedDate) => {
    logMessage('info', `Fetching bills for ${reportType} report on ${selectedDate.toDateString()}`);
    
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
// CART DETAIL OPERATIONS
// ===================

/**
 * Tạo cart detail mới
 * @param {Object} detailData - Dữ liệu cart detail
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const createDetail = async (detailData) => {
    try {
        logMessage('info', 'Creating cart detail:', detailData);
        
        // Validate required fields
        if (!detailData.bill_id || !detailData.food_id || !detailData.quantity || !detailData.price) {
            return {
                success: false,
                msg: 'Thiếu thông tin bắt buộc: bill_id, food_id, quantity, price'
            };
        }

        const newDetail = {
            bill_id: parseInt(detailData.bill_id),
            food_id: parseInt(detailData.food_id),
            quantity: parseInt(detailData.quantity),
            price: parseFloat(detailData.price),
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('cart_details')
            .insert([newDetail])
            .select('*')
            .single();

        if (error) {
            return handleSupabaseError(error, 'Create cart detail');
        }

        logMessage('success', `Cart detail created with ID: ${data.id}`);
        return { 
            success: true, 
            data: data,
            msg: 'Tạo cart detail thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in createDetail:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi tạo cart detail' 
        };
    }
};

/**
 * Lấy cart details theo bill IDs
 * @param {Array|number} billIds - Mảng ID của bills hoặc single bill ID
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const fetchDetailByBillIds = async (billIds) => {
    try {
        // Handle single ID or array
        const idsArray = Array.isArray(billIds) ? billIds : [billIds];
        
        if (!idsArray || idsArray.length === 0) {
            return { 
                success: true, 
                data: [] 
            };
        }

        logMessage('info', `Fetching cart details for bills:`, idsArray);
        
        const { data, error } = await supabase
            .from('cart_details')
            .select('*')
            .in('bill_id', idsArray)
            .order('created_at', { ascending: true });

        if (error) {
            return handleSupabaseError(error, 'Fetch cart details by bill IDs');
        }

        logMessage('success', `Cart details fetched successfully: ${data?.length || 0} items`);
        return { 
            success: true, 
            data: data || [] 
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in fetchDetailByBillIds:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi lấy cart details' 
        };
    }
};

/**
 * Cập nhật cart detail
 * @param {number} detailId - ID của cart detail
 * @param {Object} updateData - Dữ liệu cần cập nhật
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const updateCartDetail = async (detailId, updateData) => {
    try {
        logMessage('info', `Updating cart detail ${detailId}:`, updateData);
        
        if (!detailId) {
            return {
                success: false,
                msg: 'Cart detail ID không hợp lệ'
            };
        }

        const { data, error } = await supabase
            .from('cart_details')
            .update(updateData)
            .eq('id', detailId)
            .select()
            .single();

        if (error) {
            return handleSupabaseError(error, 'Update cart detail');
        }

        logMessage('success', `Cart detail ${detailId} updated successfully`);
        return { 
            success: true, 
            data: data,
            msg: 'Cập nhật cart detail thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in updateCartDetail:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi cập nhật cart detail' 
        };
    }
};

/**
 * Xóa cart detail
 * @param {number} detailId - ID của cart detail
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const deleteCartDetail = async (detailId) => {
    try {
        logMessage('info', `Deleting cart detail ${detailId}`);
        
        if (!detailId) {
            return {
                success: false,
                msg: 'Cart detail ID không hợp lệ'
            };
        }

        const { error } = await supabase
            .from('cart_details')
            .delete()
            .eq('id', detailId);

        if (error) {
            return handleSupabaseError(error, 'Delete cart detail');
        }

        logMessage('success', `Cart detail ${detailId} deleted successfully`);
        return { 
            success: true, 
            msg: 'Xóa cart detail thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in deleteCartDetail:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi xóa cart detail' 
        };
    }
};

/**
 * Xóa tất cả cart details theo bill ID
 * @param {number} billId - ID của bill
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const clearCartDetailsByBillId = async (billId) => {
    try {
        logMessage('info', `Clearing all cart details for bill ${billId}`);
        
        if (!billId) {
            return {
                success: false,
                msg: 'Bill ID không hợp lệ'
            };
        }

        const { error } = await supabase
            .from('cart_details')
            .delete()
            .eq('bill_id', billId);

        if (error) {
            return handleSupabaseError(error, 'Clear cart details by bill ID');
        }

        // Reset bill price to 0
        await updateBillPrice(billId, 0);

        logMessage('success', `Cart details cleared for bill ${billId}`);
        return { 
            success: true, 
            msg: 'Xóa tất cả cart details thành công'
        };

    } catch (error) {
        logMessage('error', 'Unexpected error in clearCartDetailsByBillId:', error);
        return { 
            success: false, 
            msg: 'Lỗi không xác định khi xóa cart details' 
        };
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
    if (!Array.isArray(bills)) {
        return {
            totalBills: 0,
            completedBills: 0,
            cancelledBills: 0,
            inOrderBills: 0,
            completedBillsData: [],
            cancelledBillsData: [],
            inOrderBillsData: []
        };
    }

    const totalBills = bills.length;
    const completedBills = bills.filter(bill => bill.state === BILL_STATES.COMPLETED);
    const cancelledBills = bills.filter(bill => bill.state === BILL_STATES.CANCELLED);
    const inOrderBills = bills.filter(bill => bill.state === BILL_STATES.IN_ORDER);
    
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
    if (!Array.isArray(completedBills) || completedBills.length === 0) {
        return {
            totalRevenue: 0,
            avgOrderValue: 0,
            totalCustomers: 0,
            avgPartySize: 0,
            maxOrderValue: 0,
            minOrderValue: 0
        };
    }

    const totalRevenue = completedBills.reduce((sum, bill) => sum + (parseFloat(bill.price) || 0), 0);
    const avgOrderValue = totalRevenue / completedBills.length;
    
    const totalCustomers = completedBills.reduce((sum, bill) => sum + (parseInt(bill.num_people) || 0), 0);
    const avgPartySize = totalCustomers / completedBills.length;
    
    const prices = completedBills.map(bill => parseFloat(bill.price) || 0);
    const maxOrderValue = Math.max(...prices);
    const minOrderValue = Math.min(...prices);
    
    return {
        totalRevenue,
        avgOrderValue,
        totalCustomers,
        avgPartySize,
        maxOrderValue,
        minOrderValue
    };
};

/**
 * Tính toán thống kê visit
 * @param {Array} bills - Danh sách tất cả bills
 * @returns {Object} Thống kê visit
 */
export const calculateVisitStats = (bills) => {
    if (!Array.isArray(bills) || bills.length === 0) {
        return {
            checkedInBills: 0,
            noShowBills: 0,
            pendingBills: 0,
            checkInRate: 0,
            noShowRate: 0,
            completionRate: 0
        };
    }

    const checkedInBills = bills.filter(bill => 
        bill.visit === VISIT_STATUSES.VISITED
    );
    const noShowBills = bills.filter(bill => 
        bill.state === BILL_STATES.CANCELLED && bill.visit === VISIT_STATUSES.UN_VISITED
    );
    const pendingBills = bills.filter(bill => 
        bill.visit === VISIT_STATUSES.ON_PROCESS
    );
    
    const totalBills = bills.length;
    const checkInRate = totalBills > 0 ? (checkedInBills.length / totalBills * 100) : 0;
    const noShowRate = totalBills > 0 ? (noShowBills.length / totalBills * 100) : 0;
    
    const completedBills = bills.filter(bill => bill.state === BILL_STATES.COMPLETED);
    const completionRate = totalBills > 0 ? (completedBills.length / totalBills * 100) : 0;
    
    return {
        checkedInBills: checkedInBills.length,
        noShowBills: noShowBills.length,
        pendingBills: pendingBills.length,
        checkInRate,
        noShowRate,
        completionRate
    };
};

/**
 * Phân tích patterns theo thời gian
 * @param {Array} bills - Danh sách bills
 * @returns {Object} Thống kê thời gian
 */
export const analyzeTimePatterns = (bills) => {
    if (!Array.isArray(bills) || bills.length === 0) {
        return {
            timeSlots: {
                [TIME_SLOTS.MORNING]: 0,
                [TIME_SLOTS.LUNCH]: 0,
                [TIME_SLOTS.AFTERNOON]: 0,
                [TIME_SLOTS.DINNER]: 0,
                [TIME_SLOTS.NIGHT]: 0
            },
            peakTime: { time: '', count: 0 }
        };
    }
    
    const timeSlots = {
        [TIME_SLOTS.MORNING]: 0,    // 6-11
        [TIME_SLOTS.LUNCH]: 0,      // 11-14
        [TIME_SLOTS.AFTERNOON]: 0,  // 14-17
        [TIME_SLOTS.DINNER]: 0,     // 17-22
        [TIME_SLOTS.NIGHT]: 0       // 22-6
    };
    
    bills.forEach(bill => {
        const hour = new Date(bill.time || bill.created_at).getHours();
        
        if (hour >= 6 && hour < 11) timeSlots[TIME_SLOTS.MORNING]++;
        else if (hour >= 11 && hour < 14) timeSlots[TIME_SLOTS.LUNCH]++;
        else if (hour >= 14 && hour < 17) timeSlots[TIME_SLOTS.AFTERNOON]++;
        else if (hour >= 17 && hour < 22) timeSlots[TIME_SLOTS.DINNER]++;
        else timeSlots[TIME_SLOTS.NIGHT]++;
    });
    
    // Tìm peak time
    const peakTime = Object.entries(timeSlots).reduce((peak, [time, count]) => 
        count > peak.count ? { time, count } : peak, { time: '', count: 0 }
    );
    
    return { timeSlots, peakTime };
};

/**
 * Tính toán toàn bộ thống kê
 * @param {Array} bills - Danh sách bills
 * @returns {Object} Tất cả thống kê
 */
export const calculateAllStats = (bills) => {
    logMessage('info', `Calculating stats for ${bills?.length || 0} bills`);
    
    if (!Array.isArray(bills)) {
        logMessage('warn', 'Bills is not an array, returning empty stats');
        return {
            totalBills: 0,
            completedBills: 0,
            cancelledBills: 0,
            inOrderBills: 0,
            totalRevenue: 0,
            avgOrderValue: 0,
            totalCustomers: 0,
            avgPartySize: 0,
            checkInRate: 0,
            noShowRate: 0,
            completionRate: 0,
            timeSlots: {},
            peakTime: { time: '', count: 0 }
        };
    }
    
    // Basic stats
    const basicStats = calculateBasicStats(bills);
    
    // Revenue stats (chỉ từ completed bills)
    const revenueStats = calculateRevenueStats(basicStats.completedBillsData);
    
    // Visit stats
    const visitStats = calculateVisitStats(bills);
    
    // Time analysis
    const timeStats = analyzeTimePatterns(bills);
    
    const allStats = {
        ...basicStats,
        ...revenueStats,
        ...visitStats,
        ...timeStats
    };
    
    logMessage('success', 'Stats calculation completed:', {
        totalBills: allStats.totalBills,
        totalRevenue: allStats.totalRevenue,
        checkInRate: allStats.checkInRate.toFixed(1) + '%',
        peakTime: allStats.peakTime
    });
    
    return allStats;
};

// ===================
// UTILITY HELPERS
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

/**
 * Format số tiền theo VNĐ
 * @param {number} amount - Số tiền
 * @returns {string} Số tiền đã format
 */
export const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '0 ₫';
    }
    
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
};

/**
 * Format percentage
 * @param {number} value - Giá trị percentage
 * @param {number} [decimals=1] - Số chữ số thập phân
 * @returns {string} Percentage đã format
 */
export const formatPercentage = (value, decimals = 1) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return '0%';
    }
    
    return `${value.toFixed(decimals)}%`;
};

/**
 * Get bill display status
 * @param {Object} bill - Bill object
 * @returns {Object} Status info với text, color, icon
 */
export const getBillDisplayStatus = (bill) => {
    if (!bill) {
        return {
            text: 'Không xác định',
            color: '#666',
            bgColor: '#f5f5f5',
            icon: 'help'
        };
    }
    
    const { state, visit } = bill;
    
    // Completed bills
    if (state === BILL_STATES.COMPLETED) {
        return {
            text: 'Hoàn thành',
            color: '#2ed573',
            bgColor: '#f0fff4',
            icon: 'check-circle'
        };
    }
    
    // Cancelled bills
    if (state === BILL_STATES.CANCELLED) {
        return {
            text: 'Đã hủy',
            color: '#ff4757',
            bgColor: '#fff0f0',
            icon: 'cancel'
        };
    }
    
    // In order bills
    if (state === BILL_STATES.IN_ORDER) {
        if (visit === VISIT_STATUSES.VISITED) {
            return {
                text: 'Có khách',
                color: '#3742fa',
                bgColor: '#f0f0ff',
                icon: 'people'
            };
        }
        
        if (visit === VISIT_STATUSES.ON_PROCESS) {
            return {
                text: 'Đã đặt',
                color: '#ffa502',
                bgColor: '#fff8f0',
                icon: 'schedule'
            };
        }
        
        if (visit === VISIT_STATUSES.UN_VISITED) {
            return {
                text: 'Chờ xác nhận',
                color: '#747d8c',
                bgColor: '#f8f9fa',
                icon: 'hourglass-empty'
            };
        }
    }
    
    return {
        text: 'Không xác định',
        color: '#666',
        bgColor: '#f5f5f5',
        icon: 'help'
    };
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
    logMessage('info', 'Setting up bills realtime subscription');
    
    if (typeof onBillChange !== 'function') {
        logMessage('error', 'onBillChange must be a function');
        return () => {};
    }
    
    const channel = supabase
        .channel('bills-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bills'
        }, (payload) => {
            logMessage('info', 'Bills change detected:', payload.eventType);
            onBillChange(payload);
        })
        .subscribe();

    // Return cleanup function
    return () => {
        logMessage('info', 'Cleaning up bills subscription');
        supabase.removeChannel(channel);
    };
};

/**
 * Setup realtime subscription cho cart details
 * @param {Function} onCartDetailChange - Callback khi có thay đổi
 * @returns {Function} Cleanup function
 */
export const subscribeToCartDetails = (onCartDetailChange) => {
    logMessage('info', 'Setting up cart details realtime subscription');
    
    if (typeof onCartDetailChange !== 'function') {
        logMessage('error', 'onCartDetailChange must be a function');
        return () => {};
    }
    
    const channel = supabase
        .channel('cart-details-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'cart_details'
        }, (payload) => {
            logMessage('info', 'Cart details change detected:', payload.eventType);
            onCartDetailChange(payload);
        })
        .subscribe();

    // Return cleanup function
    return () => {
        logMessage('info', 'Cleaning up cart details subscription');
        supabase.removeChannel(channel);
    };
};

// ===================
// EXPORTS
// ===================
export default {
    // Constants
    BILL_STATES,
    VISIT_STATUSES,
    TIME_SLOTS,
    
    // CRUD Operations
    createBill,
    updateBill,
    getBillById,
    deleteBill,
    hardDeleteBill,
    
    // Status Operations
    updateBillStatus,
    updateBillPrice,
    
    // Queries
    getAllBills,
    getBillsInDateRange,
    getBillsByDate,
    getBillsByWeek,
    getBillsByMonth,
    getBillsByReportType,
    fetchBillByTimeRange,
    getBillsByTableId,
    
    // Cart Details
    createDetail,
    fetchDetailByBillIds,
    updateCartDetail,
    deleteCartDetail,
    clearCartDetailsByBillId,
    
    // Statistics
    calculateBasicStats,
    calculateRevenueStats,
    calculateVisitStats,
    analyzeTimePatterns,
    calculateAllStats,
    
    // Utilities
    formatDateRange,
    formatCurrency,
    formatPercentage,
    getBillDisplayStatus,
    validateBillData,
    
    // Real-time
    subscribeToBills,
    subscribeToCartDetails
};