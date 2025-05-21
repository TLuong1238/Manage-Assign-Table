import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(); // Tạo AuthContext

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const setAuth = authUser => {
        setUser(authUser);
    };

    const setUserData = userData => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    if (loading) {
        return null; // Hoặc hiển thị màn hình loading
    }

    return (
        <AuthContext.Provider value={{ user, setAuth, setUserData, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook để sử dụng AuthContext
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};