import { createContext, useContext, useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../manage-employee/firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const login = (userData) => {
    console.log("User logged in:", userData); // Debugging log
    setUser(userData);
  };

  const logout = () => {
    console.log("User logged out"); // Debugging log
    setUser(null);
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User authenticated on page reload:", user); // Debugging log
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const { roles } = userData;

          // Update the user object with roles
          user.roles = roles;

          // Store the user in context
          login(user);
        } else {
          console.error("User document not found in Firestore");
        }
      } else {
        console.log("No user authenticated"); // Debugging log
        logout(); // No user is signed in
      }
    });

    return () => unsubscribe(); // Cleanup subscription
  }, []);

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
