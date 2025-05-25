import { supabase } from '../lib/supabase'

export const fetchCate = async () => {
    try {
        const { data, error } = await supabase
            .from('categories')
            .select()

        // console.log('fetchTable data: ', data);


        if (error) {
            return { success: false, msg: error?.message };
        }
        return { success: true, data };


    } catch (error) {
        console.error('Error fetching cate data:', error);
        return { succes: false, msg: error.message };
    }
}