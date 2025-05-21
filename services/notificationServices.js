import { supabase } from "../lib/supabase";



// create notifi
export const createNotification = async (notification) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) {
            console.log('notification error: ', error);
            return { success: false, msg: 'Không thể thông báo' };
        }
        return { success: true, data: data };
    } catch (error) {
        console.log('notification error: ', error);
        return { success: false, msg: 'Không thể thông báo' };
    }
}
// fetch notification
export const fetchNotification = async (receiverId, limit =20, offset = 0) => {
    try {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
            *,
            sender: senderId (id, name, image)
                 `)
            .eq('receiverId', receiverId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.log('fetch Notification error: ', error);
            return { success: false, msg: 'Không thể fetch notification' };
        }
        return { success: true, data: data };



    } catch (error) {
        console.log('fetch Notification error: ', error);
        return { success: false, msg: 'Không thể fetch notification' };
    }
}