import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login({ onLogin }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();

    // Admin
    if (username === "admin" && password === "admin123") {
      const user = {
        username: "admin",
        role: "admin",
      };

      localStorage.setItem("ticketHubUser", JSON.stringify(user));
      onLogin(user);

      navigate("/admin");
      return;
    }

    // User
    if (username === "user" && password === "user123") {
      const user = {
        username: "user",
        role: "user",
      };

      localStorage.setItem("ticketHubUser", JSON.stringify(user));
      onLogin(user);

      navigate("/");
      return;
    }

    alert("Username หรือ Password ไม่ถูกต้อง");
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-logo">
          Ticket<span>Hub</span>
        </div>

        <p className="login-title">
          Welcome Back
        </p>

        <p className="login-subtitle">
          Sign in to continue
        </p>

        <form onSubmit={handleLogin}>

          <label>Username</label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="primary-button"
          >
            Login
          </button>

        </form>

        <div className="demo-account">

          <p>Demo Account</p>

          <div>
            User :
            <b> user / user123</b>
          </div>

          <div>
            Admin :
            <b> admin / admin123</b>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Login;