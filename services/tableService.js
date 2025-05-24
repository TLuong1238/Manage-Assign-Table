import { supabase } from '../lib/supabase'

export const fetchTable = async () => {
    try {
        const {data, error} = await supabase
        .from('tables')
        .select()

        // console.log('fetchTable data: ', data);
        

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};


    } catch (error) {
        console.error('Error fetching table data:', error);
        return {succes: false, msg: error.message};
    }


}