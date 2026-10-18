import { useState } from "react";
import { Link } from "react-router-dom";

function Report({ user, onLogout }) {

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);


  const handleSubmit = (e) => {

    e.preventDefault();

    if (!subject.trim() || !message.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบ");
      return;
    }

    const oldReports =
      JSON.parse(
        localStorage.getItem("ticketHubReports")
      ) || [];


    const newReport = {
      id: `R${Date.now()}`,
      username: user?.username || "Unknown User",
      subject,
      message,
      status: "Pending",
      createdAt: new Date().toLocaleString("th-TH")
    };


    localStorage.setItem(
      "ticketHubReports",
      JSON.stringify([
        ...oldReports,
        newReport
      ])
    );


    setSubmitted(true);
    setSubject("");
    setMessage("");
  };


  return (
    <div className="report-page">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">

        <Link
          to="/"
          className="logo"
        >
          T* TICKETHUB.
        </Link>


        <div className="nav-links">

          <Link to="/">
            EVENTS
          </Link>

          <Link to="/booking-history">
            TICKETS
          </Link>

          <Link to="/report">
            REPORT ↗
          </Link>

        </div>


        <div className="nav-user">

          <span className="username">
            Hi, {user?.username || "User"}
          </span>

          <button
            type="button"
            className="logout-button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =========================
          CONTENT
      ========================= */}

      <main className="report-container">

        <div className="report-header">

          <p className="section-label">
            TICKETHUB SUPPORT
          </p>

          <h1>
            Report a Problem
          </h1>

          <p>
            พบปัญหาในการใช้งานเว็บไซต์
            สามารถแจ้งปัญหาให้ทีมงานตรวจสอบได้
          </p>

        </div>


        {submitted ? (

          <div className="report-success">

            <div className="success-icon">
              ✓
            </div>

            <h2>
              Report Submitted
            </h2>

            <p>
              ส่งรายงานปัญหาเรียบร้อยแล้ว
              ทีมงานจะตรวจสอบปัญหาของคุณ
            </p>


            <div className="report-success-actions">

              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setSubmitted(false)
                }
              >
                Report Another Problem
              </button>


              <Link
                to="/"
                className="secondary-button"
              >
                Back to Concerts
              </Link>

            </div>

          </div>

        ) : (

          <form
            className="report-form"
            onSubmit={handleSubmit}
          >

            <div className="form-group">

              <label>
                Problem Type
              </label>

              <select
                value={subject}
                onChange={(e) =>
                  setSubject(e.target.value)
                }
              >

                <option value="">
                  Select a problem
                </option>

                <option value="Payment Problem">
                  Payment Problem
                </option>

                <option value="Booking Problem">
                  Booking Problem
                </option>

                <option value="Seat Selection Problem">
                  Seat Selection Problem
                </option>

                <option value="Concert Information">
                  Concert Information
                </option>

                <option value="Website Problem">
                  Website Problem
                </option>

                <option value="Other">
                  Other
                </option>

              </select>

            </div>


            <div className="form-group">

              <label>
                Describe the Problem
              </label>

              <textarea
                rows="7"
                placeholder="Describe what happened..."
                value={message}
                onChange={(e) =>
                  setMessage(e.target.value)
                }
              />

            </div>


            <div className="report-user-info">

              <span>
                Reporting as
              </span>

              <strong>
                {user?.username || "User"}
              </strong>

            </div>


            <button
              type="submit"
              className="primary-button report-submit"
            >
              Submit Report
            </button>

          </form>

        )}

      </main>

    </div>
  );
}

export default Report;
