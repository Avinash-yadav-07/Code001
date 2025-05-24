import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

const Logout = () => {
  const navigate = useNavigate();
  const auth = getAuth();

  useEffect(() => {
    signOut(auth)
      .then(() => {
        navigate("/sign-in", { replace: true }); // Redirect to sign-in after logout
      })
      .catch((error) => {
        console.error("Logout Error:", error);
      });
  }, [auth, navigate]);

  return <p>Logging out...</p>; // Show a message while logging out
};

export default Logout;
