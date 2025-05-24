import { useState, useEffect } from "react";
import { auth, db } from "../layouts/manage-employee/firebase";
import { doc, getDoc } from "firebase/firestore";

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [roleId, setRoleId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "employees", currentUser.uid));
        if (userDoc.exists()) {
          setUser(currentUser);
          setRoleId(userDoc.data().roleId);
          setPermissions(userDoc.data().permissions || []);
        }
      } else {
        setUser(null);
        setRoleId(null);
        setPermissions([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, roleId, permissions, loading };
};

export default useAuth;
