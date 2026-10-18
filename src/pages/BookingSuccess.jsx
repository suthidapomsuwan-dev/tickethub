import { Link, useLocation } from "react-router-dom";

function BookingSuccess() {

  const location = useLocation();

  const booking = location.state;

  if (!booking) {
    return (
      <div className="page">
        <h2>Booking not found</h2>

        <Link to="/">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="success-page">

      <div className="success-card">

        <div className="success-icon">
          ✓
        </div>

        <p className="success-label">
          DEMO BOOKING CONFIRMED
        </p>

        <h1>
          Booking Confirmed!
        </h1>

        <p className="success-text">
          Your demo booking was saved. No real payment was processed.
        </p>


        <div className="booking-number">

          <span>
            Booking ID
          </span>

          <strong>
            {booking.id}
          </strong>

        </div>


        <div className="success-info">

          <div>
            <span>Concert</span>
            <b>{booking.concertName}</b>
          </div>

          <div>
            <span>Artist</span>
            <b>{booking.artist}</b>
          </div>

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
            <b>{booking.seats.join(", ")}</b>
          </div>

        </div>


        <div className="success-total">

          <span>
            Demo Total
          </span>

          <strong>
            ฿{booking.total.toLocaleString()}
          </strong>

        </div>


        <div className="success-actions">

          <Link
            to="/booking-history"
            className="primary-button"
          >
            View My Bookings
          </Link>

          <Link
            to="/"
            className="secondary-button"
          >
            Back to Concerts
          </Link>

        </div>

      </div>

    </div>
  );
}

export default BookingSuccess;
