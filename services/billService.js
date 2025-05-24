import { supabase } from "../lib/supabase";

// Hàm tạo đặt bàn
export const createReservation = async (bill) => {
    try {
        const { data, error } = await supabase
            .from('bills') // Giả định tên bảng là 'reservations'
            .insert(bill)
            .select()

        if (error) {
            console.log('Reservation error: ', error);
            return { success: false, msg: 'Không thể đặt bàn' };
        }
        return { success: true, data: data };
    } catch (error) {
        console.log('Reservation error: ', error);
        return { success: false, msg: 'Không thể đặt bàn' };
    }
}

export const fetchBill = async () => {
    try {
        const { data, error } = await supabase
            .from('bills')  
            .select('*')
            .order('created_at', { ascending: false });
            
        console.log('fetchBill data: ', data);
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

/**
 * Lấy danh sách đặt bàn trong khoảng thời gian (không giới hạn số lượng)
 */
export const fetchBillByTimeRange = async (startDate, endDate, time) => {
    if (time) {
        const baseDate = startDate || new Date();
        const targetDateTime = new Date(baseDate);

        // Đặt thời gian từ specificTime
        const timeToSet = new Date(time);
        targetDateTime.setHours(
            timeToSet.getHours(),
            timeToSet.getMinutes(),
            timeToSet.getSeconds(),
            0
        );

        // Tạo khoảng ±1 giờ
        const startTime = new Date(targetDateTime.getTime() - 2 * 60 * 60 * 1000);
        const endTime = new Date(targetDateTime.getTime() + 2 * 60 * 60 * 1000);

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
    } else {
        try {
            const startOfDay = new Date(startDate);
            startOfDay.setUTCHours(0, 0, 0, 0);
            console.log('startOfDay:', startOfDay.toISOString());

            const endOfDay = new Date(endDate);
            endOfDay.setUTCHours(23, 59, 59, 999);
            console.log('endOfDay:', endOfDay.toISOString());


            const { data, error } = await supabase
                .from('bills')
                .select('*')
                .gte('time', startOfDay.toISOString()) // Từ đầu ngày
                .lte('time', endOfDay.toISOString())
                .order('time', { ascending: true });

            if (error) {
                console.log('fetchBillByTimeRange error: ', error);
                return { success: false, msg: 'Không thể lấy dữ liệu đặt bàn' };
            }

            return { success: true, data };
        } catch (error) {
            console.log('fetchBillByTimeRange error: ', error);
            return { success: false, msg: 'Có lỗi xảy ra khi lấy dữ liệu đặt bàn' };
        }
    }
}