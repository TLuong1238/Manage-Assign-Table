import { supabase } from "../lib/supabase";

export const fetchUsers = async () => {
    try {
        const {data, error} = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching users:', error);
        return {success: false, msg: error.message};
    }
}

// Tạo tài khoản mới
export const createUser = async (userData) => {
    try {
        const {data, error} = await supabase
        .from('users')
        .insert({
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            address: userData.address || '',
            bio: userData.bio || '',
            image: userData.image || null,
            role: userData.role || 'user',
            created_at: new Date().toISOString()
        })
        .select()
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error creating user:', error);
        return {success: false, msg: error.message};
    }
}

// Cập nhật tài khoản
export const updateUser = async (userId, userData) => {
    try {
        const {data, error} = await supabase
        .from('users')
        .update({
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            address: userData.address,
            bio: userData.bio,
            image: userData.image,
            role: userData.role
        })
        .eq('id', userId)
        .select()
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error updating user:', error);
        return {success: false, msg: error.message};
    }
}

// Xóa tài khoản
export const deleteUser = async (userId) => {
    try {
        const {error} = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true};

    } catch (error) {
        console.error('Error deleting user:', error);
        return {success: false, msg: error.message};
    }
}

// Tìm kiếm tài khoản
export const searchUsers = async (searchTerm) => {
    try {
        const {data, error} = await supabase
        .from('users')
        .select('*')
        .or(`name.ilike.%${searchTerm}%, email.ilike.%${searchTerm}%, phone.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error searching users:', error);
        return {success: false, msg: error.message};
    }
}

// Lấy tài khoản theo ID
export const getUserById = async (userId) => {
    try {
        const {data, error} = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching user by ID:', error);
        return {success: false, msg: error.message};
    }
}

// Kiểm tra email có tồn tại
export const checkEmailExists = async (email, excludeUserId = null) => {
    try {
        let query = supabase
        .from('users')
        .select('id')
        .eq('email', email);

        if (excludeUserId) {
            query = query.neq('id', excludeUserId);
        }

        const {data, error} = await query;

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, exists: data.length > 0};

    } catch (error) {
        console.error('Error checking email:', error);
        return {success: false, msg: error.message};
    }
}
// 
export const checkAdminRole = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return { success: false, isAdmin: false };
    }

    return { success: true, isAdmin: data.role === 'admin' };
  } catch (e) {
    return { success: false, isAdmin: false };
  }
};