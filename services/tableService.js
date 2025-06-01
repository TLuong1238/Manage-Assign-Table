import { supabase } from "../lib/supabase";

// Lấy tất cả bàn
export const fetchTable = async () => {
    try {
        const { data, error } = await supabase
            .from('tables')
            .select('*')
            .order('floor', { ascending: true })
            .order('id', { ascending: true });

        if (error) {
            return { success: false, msg: error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching tables:', error);
        return { success: false, msg: error.message };
    }
};

// Lấy tất cả tầng có bàn
export const getAllFloors = async () => {
    try {
        const { data, error } = await supabase
            .from('tables')
            .select('floor')
            .order('floor', { ascending: true });

        if (error) {
            return { success: false, msg: error.message };
        }

        const floors = [...new Set(data.map(item => item.floor))].sort((a, b) => a - b);
        return { success: true, data: floors };
    } catch (error) {
        console.error('Error fetching floors:', error);
        return { success: false, msg: error.message };
    }
};

// Lấy tất cả bill (không lọc theo thời gian như assignTableScr)
export const fetchAllBills = async () => {
    try {
        const { data, error } = await supabase
            .from('bills')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return { success: false, msg: error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching all bills:', error);
        return { success: false, msg: error.message };
    }
};

// Lấy detail bills theo billIds (giống assignTableScr)
export const fetchDetailByBillIds = async (billIds) => {
    try {
        if (!billIds || billIds.length === 0) {
            return { success: true, data: [] };
        }

        const { data, error } = await supabase
            .from('detailBills')
            .select('*')
            .in('billId', billIds);

        if (error) {
            return { success: false, msg: error.message };
        }
        return { success: true, data };
    } catch (error) {
        console.error('Error fetching detail bills:', error);
        return { success: false, msg: error.message };
    }
};

// Logic xác định trạng thái bàn dựa trên bill (cải tiến từ assignTableScr)
const determineTableStatus = (bill) => {
    if (!bill) return 'empty';

    const now = new Date();
    const billTime = new Date(bill.time);
    const timeDiff = billTime.getTime() - now.getTime();
    const minutesUntilBill = Math.floor(timeDiff / (1000 * 60));

    console.log(`Bill ${bill.id}: state=${bill.state}, visit=${bill.visit}, minutesUntil=${minutesUntilBill}`);

    // Logic trạng thái dựa trên state và visit
    switch (bill.state) {
        case 'in_order':
            if (bill.visit === 'in_process') {
                return 'occupied'; // Đang có khách (đã checkin)
            } else {
                // Chưa checkin - kiểm tra thời gian
                if (minutesUntilBill > 0) {
                    return 'reserved'; // Đã đặt, chưa đến giờ
                } else {
                    return 'ready'; // Đã đến giờ, chưa checkin
                }
            }

        case 'completed':
        case 'cancelled':
            return 'empty'; // Đã hoàn thành hoặc hủy

        default:
            return 'empty';
    }
};

// Function chính: Kết hợp dữ liệu bàn với bill (áp dụng flow từ assignTableScr)
export const getTablesWithBillStatus = async () => {
    try {
        // 1. Lấy tất cả bàn
        const tablesResult = await fetchTable();
        if (!tablesResult.success) {
            return { success: false, msg: 'Không thể lấy dữ liệu bàn' };
        }

        // 2. Lấy tất cả bill
        const billsResult = await fetchAllBills();
        if (!billsResult.success) {
            return { success: false, msg: 'Không thể lấy dữ liệu bill' };
        }

        const allBills = billsResult.data;
        console.log('Total bills:', allBills.length);

        // 3. Lọc bills có state = 'in_order' (giống assignTableScr)
        const activeBills = allBills.filter(bill => bill.state === 'in_order');
        console.log('Active bills (in_order):', activeBills.length);

        // 4. Lấy detail bills của những bills active
        const activeBillIds = activeBills.map(bill => bill.id);

        let detailBills = [];
        if (activeBillIds.length > 0) {
            const detailResult = await fetchDetailByBillIds(activeBillIds);
            if (detailResult.success) {
                detailBills = detailResult.data;
                console.log('Detail bills:', detailBills.length);
            }
        }

        // 5. Tạo map từ tableId -> bill (giống logic assignTableScr)
        const tableBillMap = {};
        detailBills.forEach(detail => {
            const bill = activeBills.find(b => b.id === detail.billId);
            if (bill) {
                tableBillMap[detail.tableId] = bill;
            }
        });

        console.log('Table-Bill mapping:', Object.keys(tableBillMap));

        // 6. Update tables với bill status (cải tiến từ assignTableScr)
        const tablesWithStatus = tablesResult.data.map(table => {
            const bill = tableBillMap[table.id];
            const status = determineTableStatus(bill);

            return {
                ...table,
                bill: bill || null,
                status: status,
                isOccupied: status === 'occupied',
                isReserved: status === 'reserved',
                isReady: status === 'ready',
                isEmpty: status === 'empty'
            };
        });

        console.log('Tables with status:', tablesWithStatus.map(t => ({
            id: t.id,
            status: t.status,
            hasBill: !!t.bill
        })));

        return { success: true, data: tablesWithStatus };
    } catch (error) {
        console.error('Error getting tables with bill status:', error);
        return { success: false, msg: error.message };
    }
};

// Utility functions
export const getTimeUntilNextBill = (bill) => {
    if (!bill || !bill.time) return null;

    const now = new Date();
    const billTime = new Date(bill.time);
    const diffInMs = billTime.getTime() - now.getTime();

    if (diffInMs <= 0) return { minutes: 0, seconds: 0, isOverdue: true };

    const minutes = Math.floor(diffInMs / (1000 * 60));
    const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);

    return { minutes, seconds, isOverdue: false };
};

// Format trạng thái để hiển thị
export const getStatusDisplayInfo = (table) => {
    switch (table.status) {
        case 'occupied':
            return {
                color: '#ff4757',
                text: 'Có khách',
                icon: 'restaurant'
            };
        case 'reserved':
            return {
                color: '#ffa502',
                text: 'Đã đặt',
                icon: 'schedule'
            };
        case 'ready':
            return {
                color: '#ff6b6b',
                text: 'Sẵn sàng',
                icon: 'access-time'
            };
        case 'empty':
        default:
            return {
                color: '#95e39d',
                text: 'Bàn trống',
                icon: 'table-bar'
            };
    }
};

// Action functions
// Action functions
export const checkinCustomer = async (billId) => {
    try {
        const { error } = await supabase
            .from('bills')
            .update({ visit: 'visited' })
            .eq('id', billId);

        if (error) {
            return { success: false, msg: error.message };
        }

        // ✅ Refresh table status sau check-in
        const refreshResult = await getTablesWithBillStatus();
        if (refreshResult.success) {
            return {
                success: true,
                updatedTables: refreshResult.data
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Error checking in customer:', error);
        return { success: false, msg: error.message };
    }
};

export const checkoutCustomer = async (billId) => {
    try {
        const { error } = await supabase
            .from('bills')
            .update({
                state: 'completed',
                visit: 'visited'
            })
            .eq('id', billId);

        if (error) {
            return { success: false, msg: error.message };
        }

        // ✅ Refresh table status sau check-out
        const refreshResult = await getTablesWithBillStatus();
        if (refreshResult.success) {
            return {
                success: true,
                updatedTables: refreshResult.data
            };
        }

        return { success: true };
    } catch (error) {
        console.error('Error checking out customer:', error);
        return { success: false, msg: error.message };
    }
};

export const cancelReservation = async (billId) => {
    try {
        const { error } = await supabase
            .from('bills')
            .update({
                state: 'cancelled',
                visit: 'un_visited'
            })
            .eq('id', billId);

        if (error) {
            return { success: false, msg: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        return { success: false, msg: error.message };
    }
};