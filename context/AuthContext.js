import { createContext, useState, useContext } from "react";

const AuthContext = createContext();


export const AuthProvider = ({children}) => {
    const [user,setuser] = useState(null);

    const setAuth = authUser => {
        setuser(authUser);
    }

    const setUserData = userData => {
        setuser({...userData});
    }

    return(
        <AuthContext.Provider value ={{user, setAuth, setUserData}}>
            {children}
        </AuthContext.Provider>
    )

}

export const useAuth = () => useContext(AuthContext);