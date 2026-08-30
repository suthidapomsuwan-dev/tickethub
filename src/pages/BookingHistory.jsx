import React from "react";
import { Link } from "react-router-dom";

function BookingHistory() {
  const bookings =
    JSON.parse(
      localStorage.getItem("ticketHubBookings")
    ) || [];

  return (
    <div className="history-page">

      {/* NAVBAR */}

      <nav className="navbar">

        <Link to="/" className="logo">
          Ticket<span>Hub</span>
        </Link>

        <div className="nav-links">

          <Link to="/">
            Concerts
          </Link>

          <Link to="/booking-history">
            My Bookings
          </Link>

          <Link to="/report">
            Report Problem
          </Link>

        </div>

        <Link
          to="/"
          className="login-button"
        >
          Back
        </Link>

      </nav>


      {/* CONTENT */}

      <main className="history-container">

        <div className="history-heading">

          <p className="section-label">
            MY ACCOUNT
          </p>

          <h1>
            My Bookings
          </h1>

          <p>
            View your previous concert bookings
          </p>

        </div>


        {bookings.length === 0 ? (

          /* EMPTY */

          <div className="empty-bookings">

            <div className="empty-icon">
              🎫
            </div>

            <h2>
              No bookings yet
            </h2>

            <p>
              You haven't booked any concerts yet.
            </p>

            <Link
              to="/"
              className="primary-button"
            >
              Explore Concerts
            </Link>

          </div>

        ) : (

          /* BOOKING LIST */

          <div className="booking-history-list">

            {bookings
              .slice()
              .reverse()
              .map((booking) => (

                <div
                  className="history-card"
                  key={booking.id}
                >

                  <div className="history-image">

                    <img
                      src={
                        booking.image ||
                        "https://images.unsplash.com/photo-1501386761578-eac5c94b800a"
                      }
                      alt={booking.concertName}
                    />

                  </div>


                  <div className="history-content">

                    <div className="history-top">

                      <div>

                        <p className="history-status">
                          {booking.status}
                        </p>

                        <h2>
                          {booking.concertName}
                        </h2>

                        <p className="history-artist">
                          {booking.artist}
                        </p>

                      </div>

                      <strong className="history-price">
                        ฿{booking.total.toLocaleString()}
                      </strong>

                    </div>


                    <div className="history-details">

                      <div>
                        <span>Date</span>
                        <b>{booking.date}</b>
                      </div>

                      <div>
                        <span>Venue</span>
                        <b>{booking.venue}</b>
                      </div>

                      <div>
                        <span>Zone</span>
                        <b>{booking.zone}</b>
                      </div>

                      <div>
                        <span>Seats</span>
                        <b>
                          {booking.seats.join(", ")}
                        </b>
                      </div>

                    </div>


                    <div className="history-footer">

                      <span>
                        Booking ID:
                        <b>{booking.id}</b>
                      </span>

                      <span>
                        {booking.createdAt}
                      </span>

                    </div>

                  </div>

                </div>

              ))}

          </div>

        )}

      </main>

    </div>
  );
}

export default BookingHistory;