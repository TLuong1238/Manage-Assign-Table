import { supabase } from '../lib/supabase';

/**
 * 📋 Get details by bill ID
 * @param {number} billId - Bill ID
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getDetailsByBillId = async (billId) => {
    try {
        console.log('🔍 Getting details for bill ID:', billId);

        const { data, error } = await supabase
            .from('detailsBill')
            .select(`
                id,
                billId,
                tableId,
                productId,
                quantity,
                price,
                name,
                image,
                created_at,
                updated_at
            `)
            .eq('billId', billId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('❌ Get details by bill ID error:', error);
            return { success: false, msg: error.message };
        }

        console.log(`✅ Found ${data?.length || 0} details for bill ${billId}`);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('❌ Get details by bill ID error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * ➕ Add detail to bill
 * @param {Object} detailData - Detail data
 * @param {number} detailData.billId - Bill ID
 * @param {number} detailData.tableId - Table ID
 * @param {number} detailData.productId - Product ID
 * @param {number} detailData.quantity - Quantity
 * @param {number} detailData.price - Price per unit
 * @param {string} detailData.name - Product name
 * @param {string} detailData.image - Product image URL
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const addDetailsBill = async (detailData) => {
    try {
        console.log('➕ Adding detail to bill:', detailData);

        // Validate required fields
        if (!detailData.billId || !detailData.tableId || !detailData.productId) {
            return { success: false, msg: 'Missing required fields: billId, tableId, or productId' };
        }

        if (!detailData.quantity || detailData.quantity <= 0) {
            return { success: false, msg: 'Quantity must be greater than 0' };
        }

        if (!detailData.price || detailData.price < 0) {
            return { success: false, msg: 'Price must be greater than or equal to 0' };
        }

        const { data, error } = await supabase
            .from('detailsBill')
            .insert({
                billId: detailData.billId,
                tableId: detailData.tableId,
                productId: detailData.productId,
                quantity: detailData.quantity,
                price: detailData.price,
                name: detailData.name || '',
                image: detailData.image || null,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Add detail to bill error:', error);
            return { success: false, msg: error.message };
        }

        console.log('✅ Detail added successfully:', data.id);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Add detail to bill error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * ✏️ Update detail in bill
 * @param {number} detailId - Detail ID
 * @param {Object} updateData - Update data
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const updateDetailsBill = async (detailId, updateData) => {
    try {
        console.log('✏️ Updating detail:', detailId, updateData);

        const { data, error } = await supabase
            .from('detailsBill')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', detailId)
            .select()
            .single();

        if (error) {
            console.error('❌ Update detail error:', error);
            return { success: false, msg: error.message };
        }

        console.log('✅ Detail updated successfully:', data.id);
        return { success: true, data };
    } catch (error) {
        console.error('❌ Update detail error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🗑️ Delete detail from bill
 * @param {number} detailId - Detail ID
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const deleteDetailsBill = async (detailId) => {
    try {
        console.log('🗑️ Deleting detail:', detailId);

        const { error } = await supabase
            .from('detailsBill')
            .delete()
            .eq('id', detailId);

        if (error) {
            console.error('❌ Delete detail error:', error);
            return { success: false, msg: error.message };
        }

        console.log('✅ Detail deleted successfully:', detailId);
        return { success: true };
    } catch (error) {
        console.error('❌ Delete detail error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🔄 Update detail quantity
 * @param {number} detailId - Detail ID
 * @param {number} newQuantity - New quantity
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const updateDetailQuantity = async (detailId, newQuantity) => {
    try {
        console.log('🔄 Updating detail quantity:', detailId, newQuantity);

        if (newQuantity <= 0) {
            return { success: false, msg: 'Quantity must be greater than 0' };
        }

        const { data, error } = await supabase
            .from('detailsBill')
            .update({
                quantity: newQuantity,
                updated_at: new Date().toISOString()
            })
            .eq('id', detailId)
            .select()
            .single();

        if (error) {
            console.error('❌ Update detail quantity error:', error);
            return { success: false, msg: error.message };
        }

        console.log('✅ Detail quantity updated successfully');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Update detail quantity error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🔍 Get detail by ID
 * @param {number} detailId - Detail ID
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const getDetailById = async (detailId) => {
    try {
        const { data, error } = await supabase
            .from('detailsBill')
            .select('*')
            .eq('id', detailId)
            .single();

        if (error) {
            console.error('❌ Get detail by ID error:', error);
            return { success: false, msg: error.message };
        }

        return { success: true, data };
    } catch (error) {
        console.error('❌ Get detail by ID error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 📊 Get details by product ID
 * @param {number} productId - Product ID
 * @param {number} limit - Limit results (default: 50)
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const getDetailsByProductId = async (productId, limit = 50) => {
    try {
        const { data, error } = await supabase
            .from('detailsBill')
            .select(`
                id,
                billId,
                tableId,
                quantity,
                price,
                created_at,
                bills!inner(
                    id,
                    name,
                    phone,
                    time,
                    state
                )
            `)
            .eq('productId', productId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Get details by product ID error:', error);
            return { success: false, msg: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('❌ Get details by product ID error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 📈 Get details statistics
 * @param {number} billId - Bill ID (optional)
 * @returns {Promise<{success: boolean, data?: Object, msg?: string}>}
 */
export const getDetailsStats = async (billId = null) => {
    try {
        let query = supabase
            .from('detailsBill')
            .select('quantity, price');

        if (billId) {
            query = query.eq('billId', billId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('❌ Get details stats error:', error);
            return { success: false, msg: error.message };
        }

        const stats = {
            totalItems: data?.length || 0,
            totalQuantity: data?.reduce((sum, item) => sum + item.quantity, 0) || 0,
            totalValue: data?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0,
            averagePrice: 0,
            averageQuantity: 0
        };

        if (stats.totalItems > 0) {
            stats.averagePrice = stats.totalValue / stats.totalQuantity;
            stats.averageQuantity = stats.totalQuantity / stats.totalItems;
        }

        return { success: true, data: stats };
    } catch (error) {
        console.error('❌ Get details stats error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🗑️ Delete all details by bill ID
 * @param {number} billId - Bill ID
 * @returns {Promise<{success: boolean, msg?: string}>}
 */
export const deleteDetailsByBillId = async (billId) => {
    try {
        console.log('🗑️ Deleting all details for bill:', billId);

        const { error } = await supabase
            .from('detailsBill')
            .delete()
            .eq('billId', billId);

        if (error) {
            console.error('❌ Delete details by bill ID error:', error);
            return { success: false, msg: error.message };
        }

        console.log('✅ All details deleted for bill:', billId);
        return { success: true };
    } catch (error) {
        console.error('❌ Delete details by bill ID error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🔄 Bulk insert details
 * @param {Array} detailsArray - Array of detail objects
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const bulkInsertDetails = async (detailsArray) => {
    try {
        console.log('🔄 Bulk inserting details:', detailsArray.length);

        if (!detailsArray || detailsArray.length === 0) {
            return { success: false, msg: 'No details to insert' };
        }

        // Validate all details
        for (const detail of detailsArray) {
            if (!detail.billId || !detail.tableId || !detail.productId) {
                return { success: false, msg: 'Missing required fields in details' };
            }
        }

        const { data, error } = await supabase
            .from('detailsBill')
            .insert(detailsArray.map(detail => ({
                ...detail,
                created_at: new Date().toISOString()
            })))
            .select();

        if (error) {
            console.error('❌ Bulk insert details error:', error);
            return { success: false, msg: error.message };
        }

        console.log(`✅ Successfully inserted ${data?.length || 0} details`);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('❌ Bulk insert details error:', error);
        return { success: false, msg: error.message };
    }
};

/**
 * 🔍 Search details by product name
 * @param {string} searchTerm - Search term
 * @param {number} limit - Limit results (default: 20)
 * @returns {Promise<{success: boolean, data?: Array, msg?: string}>}
 */
export const searchDetailsByProductName = async (searchTerm, limit = 20) => {
    try {
        const { data, error } = await supabase
            .from('detailsBill')
            .select(`
                id,
                billId,
                tableId,
                productId,
                quantity,
                price,
                name,
                image,
                created_at
            `)
            .ilike('name', `%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('❌ Search details error:', error);
            return { success: false, msg: error.message };
        }

        return { success: true, data: data || [] };
    } catch (error) {
        console.error('❌ Search details error:', error);
        return { success: false, msg: error.message };
    }
};