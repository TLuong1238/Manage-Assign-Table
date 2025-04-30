import { supabase } from "../lib/supabase";

export const getUserData = async (userId) => {
    try {
        const {data, error} = await supabase
        .from('users')
        .select()
        .eq('id', userId)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};


    } catch (error) {
        console.error('Error fetching user data:', error);
        return {succes: false, msg: error.message};
    }


}
export const updateUserData = async (userId, data) => {
    try {
        const {error} = await supabase
        .from('users')
        .update(data)
        .eq("id",userId);

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};


    } catch (error) {
        console.error('Error fetching user data:', error);
        return {succes: false, msg: error.message};
    }
}