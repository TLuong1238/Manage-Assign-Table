import { supabase } from "../lib/supabase";

export const fetchProduct = async () => {
    try {
        const {data, error} = await supabase
        .from('products')
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching products:', error);
        return {success: false, msg: error.message};
    }
}

// Tạo sản phẩm mới
export const createProduct = async (productData) => {
    try {
        const {data, error} = await supabase
        .from('products')
        .insert({
            name: productData.name,
            description: productData.description || '',
            price: productData.price,
            image: productData.image || null,
            cateId: productData.cateId,  // Đổi tên field
            created_at: new Date().toISOString()
        })
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error creating product:', error);
        return {success: false, msg: error.message};
    }
}

// Cập nhật sản phẩm
export const updateProduct = async (productId, productData) => {
    try {
        const {data, error} = await supabase
        .from('products')
        .update({
            name: productData.name,
            description: productData.description,
            price: productData.price,
            image: productData.image,
            cateId: productData.cateId,  
        })
        .eq('id', productId)
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error updating product:', error);
        return {success: false, msg: error.message};
    }
}

// Xóa sản phẩm
export const deleteProduct = async (productId) => {
    try {
        const {error} = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true};

    } catch (error) {
        console.error('Error deleting product:', error);
        return {success: false, msg: error.message};
    }
}

// Tìm kiếm sản phẩm theo tên
export const searchProducts = async (searchTerm) => {
    try {
        const {data, error} = await supabase
        .from('products')
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .ilike('name', `%${searchTerm}%`)
        .order('created_at', { ascending: false });

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error searching products:', error);
        return {success: false, msg: error.message};
    }
}

// Lấy sản phẩm theo ID
export const getProductById = async (productId) => {
    try {
        const {data, error} = await supabase
        .from('products')
        .select(`
            *,
            categories (
                id,
                name
            )
        `)
        .eq('id', productId)
        .single();

        if(error) {
            return {success: false, msg: error?.message};
        }
        return {success: true, data};

    } catch (error) {
        console.error('Error fetching product by ID:', error);
        return {success: false, msg: error.message};
    }
}
//thích sản phẩm
export const updateProductFavorite = async (productId, isFavor) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .update({ isFavor: isFavor })
            .eq('id', productId)
            .select();

        if (error) {
            return { success: false, msg: error.message };
        }

        return { success: true, data: data[0] };
    } catch (error) {
        console.log('updateProductFavorite error: ', error);
        return { success: false, msg: error.message };
    }
};