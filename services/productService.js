import { supabase } from '../lib/supabase'

export const fetchProduct = async () => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select()

        // console.log('fetchTable data: ', data);


        if (error) {
            return { success: false, msg: error?.message };
        }
        return { success: true, data };


    } catch (error) {
        console.error('Error fetching product data:', error);
        return { succes: false, msg: error.message };
    }
}

export const fetchProductById = async (productId) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select()
            .eq('id', productId)
            .single(); // Lấy duy nhất 1 sản phẩm

        if (error) {
            return { success: false, msg: error?.message };
        }
        return { success: true, data };

    } catch (error) {
        console.error('Error fetching product data:', error);
        return { success: false, msg: error.message };
    }
}