import { supabase } from "../lib/supabase";

export const fetchCate = async () => {
    try {
        const {data, error} = await supabase
        .from('categories')
        .select('*')
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching categories:', error);
        return {success: false, msg: error.message};
    }
}

// Tạo danh mục mới
export const createCategory = async (categoryData) => {
    try {
        const {data, error} = await supabase
        .from('categories')
        .insert({
            name: categoryData.name,
            description: categoryData.description || '',
            image: categoryData.image || null,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error creating category:', error);
        return {success: false, msg: error.message};
    }
}

// Cập nhật danh mục
export const updateCategory = async (categoryId, categoryData) => {
    try {
        const {data, error} = await supabase
        .from('categories')
        .update({
            name: categoryData.name,
            description: categoryData.description,
            image: categoryData.image,
            updated_at: new Date().toISOString()
        })
        .eq('id', categoryId)
        .select()
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error updating category:', error);
        return {success: false, msg: error.message};
    }
}

// Xóa danh mục
export const deleteCategory = async (categoryId) => {
    try {
        const {error} = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true};

    } catch (error) {
        console.error('Error deleting category:', error);
        return {success: false, msg: error.message};
    }
}

// Tìm kiếm danh mục theo tên
export const searchCategories = async (searchTerm) => {
    try {
        const {data, error} = await supabase
        .from('categories')
        .select('*')
        .ilike('name', `%${searchTerm}%`)
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error searching categories:', error);
        return {success: false, msg: error.message};
    }
}

// Lấy danh mục theo ID
export const getCategoryById = async (categoryId) => {
    try {
        const {data, error} = await supabase
        .from('categories')
        .select('*')
        .eq('id', categoryId)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching category by ID:', error);
        return {success: false, msg: error.message};
    }
}