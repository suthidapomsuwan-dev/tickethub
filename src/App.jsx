import React, { useState } from "react";

import {
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import Home from "./pages/Home";
import ConcertDetail from "./pages/ConcertDetail";
import ProtectedRoute from "./components/ProtectedRoute";
import Payment from "./pages/Payment";
import BookingSuccess from "./pages/BookingSuccess";
import BookingHistory from "./pages/BookingHistory";
import AdminDashboard from "./pages/AdminDashboard";
import Report from "./pages/Report";


function App() {

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem("ticketHubUser")
      ) || null;
    } catch {
      return null;
    }
  });


  // LOGIN
  const handleLogin = (userData) => {

    localStorage.setItem(
      "ticketHubUser",
      JSON.stringify(userData)
    );

    setUser(userData);
  };


  // LOGOUT
  const handleLogout = () => {

    localStorage.removeItem(
      "ticketHubUser"
    );

    setUser(null);
  };


  return (
    <Routes>

      {/* LOGIN */}

      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={
                user.role === "admin"
                  ? "/admin"
                  : "/"
              }
              replace
            />
          ) : (
            <Login
              onLogin={handleLogin}
            />
          )
        }
      />


      {/* HOME */}

      <Route
        path="/"
        element={
          <ProtectedRoute
            user={user}
            role="user"
          >
            <Home
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />


      {/* CONCERT DETAIL */}

      <Route
        path="/concert/:id"
        element={
          <ProtectedRoute
            user={user}
            role="user"
          >
            <ConcertDetail />
          </ProtectedRoute>
        }
      />


      {/* PAYMENT */}

      <Route
        path="/payment"
        element={
          <ProtectedRoute
            user={user}
            role="user"
          >
            <Payment />
          </ProtectedRoute>
        }
      />


      {/* BOOKING SUCCESS */}

      <Route
        path="/booking-success"
        element={
          <ProtectedRoute
            user={user}
            role="user"
          >
            <BookingSuccess />
          </ProtectedRoute>
        }
      />


      {/* BOOKING HISTORY */}

      <Route
        path="/booking-history"
        element={
          <ProtectedRoute
            user={user}
            role="user"
          >
            <BookingHistory />
          </ProtectedRoute>
        }
      />


      {/* REPORT */}

      <Route
  path="/report"
  element={
    <ProtectedRoute
      user={user}
      role="user"
    >
      <Report
        user={user}
        onLogout={handleLogout}
      />
    </ProtectedRoute>
  }
/>

      {/* ADMIN */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute
            user={user}
            role="admin"
          >
            <AdminDashboard
              user={user}
              onLogout={handleLogout}
            />
          </ProtectedRoute>
        }
      />


      {/* NOT FOUND */}

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

    </Routes>
  );
}

export default App;