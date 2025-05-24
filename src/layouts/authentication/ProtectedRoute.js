import { Navigate } from "react-router-dom";
import { useAuth } from "./authcontext";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  console.log("User in ProtectedRoute:", user); // Debugging log
  console.log("Allowed Roles:", allowedRoles); // Debugging log

  if (!user) {
    console.log("User not authenticated, redirecting to sign-in"); // Debugging log
    return <Navigate to="/sign-in" replace />;
  }

  const hasAccess = allowedRoles.some((role) => user.roles.includes(role));
  console.log("User roles:", user.roles); // Debugging log
  console.log("Has access:", hasAccess); // Debugging log

  if (!hasAccess) {
    console.log("User not authorized for this route, redirecting to unauthorized"); // Debugging log
    return <Navigate to="/unauthorized" replace />; // Redirect to unauthorized page
  }

  // Render the requested component
  console.log("Rendering the requested component"); // Debugging log
  return children; // Render the wrapped component directly
};

export default ProtectedRoute;
