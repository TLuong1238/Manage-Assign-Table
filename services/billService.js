import { supabase } from "../lib/supabase";

// Hàm tạo đặt bàn
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


export const fetchBillByTimeRange = async (time) => {
    try {
        const targetDateTime = new Date(time);

        // Tạo khoảng ±2 giờ
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

        // Phân bổ người cho từng bàn
        while (remainingPeople > 0 && tableIndex < tableIds.length) {
            const currentTableId = tableIds[tableIndex];

            // Tính số người cho bàn hiện tại (tối đa 6 người/bàn)
            const peopleForThisTable = Math.min(remainingPeople, 6);

            // Tạo số detail tương ứng với số người (mỗi detail = 1 người hoặc tối đa 6 người)
            // Nếu bảng detailBills chỉ có id, billId, tableId thì mỗi detail đại diện cho 1 "slot" 6 người
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