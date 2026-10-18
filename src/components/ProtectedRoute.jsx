import { Navigate } from "react-router-dom";

function ProtectedRoute({ user, role, children }) {

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {

    if (user.role === "admin") {
      return <Navigate to="/admin" replace />;
    }

    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
