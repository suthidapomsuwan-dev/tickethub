import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, onValue, remove } from "firebase/database";
import { db } from "../firebase";

function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);

  /* =========================================================
     LOAD BOOKINGS
  ========================================================= */

  useEffect(() => {
    const bookingsRef = ref(db, "bookings");

    const unsubscribe = onValue(
      bookingsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setBookings([]);
          setLoading(false);
          return;
        }

        const bookingList = Array.isArray(data)
          ? data.map((booking, index) => ({
              ...booking,
              firebaseKey: String(index),
            }))
          : Object.entries(data).map(
              ([key, value]) => ({
                ...value,
                firebaseKey: key,
              })
            );

        setBookings(
          bookingList
            .filter(Boolean)
            .reverse()
        );

        setLoading(false);
      },
      (error) => {
        console.error(
          "Cannot load bookings:",
          error
        );

        setBookings([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     CURRENT USER
  ========================================================= */

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("ticketHubUser"));
    } catch {
      return null;
    }
  })();

  const username =
    currentUser?.username ||
    currentUser?.email ||
    "";
  const userId = currentUser?.uid || currentUser?.userId || currentUser?.id || "";

  /* =========================================================
     FILTER USER BOOKINGS
  ========================================================= */

  const userBookings = bookings.filter(
    (booking) => {
      if (
        !booking.user &&
        !booking.username &&
        !booking.email
      ) {
        return true;
      }

      if (
        booking.userId &&
        userId &&
        String(booking.userId) === String(userId)
      ) {
        return true;
      }

      if (
        booking.username &&
        String(booking.username) ===
          String(username)
      ) {
        return true;
      }

      if (
        booking.email &&
        String(booking.email) ===
          String(username)
      ) {
        return true;
      }

      if (
        booking.user &&
        typeof booking.user ===
          "string" &&
        String(booking.user) ===
          String(username)
      ) {
        return true;
      }

      if (
        booking.user?.username &&
        String(
          booking.user.username
        ) === String(username)
      ) {
        return true;
      }

      if (
        booking.user?.email &&
        String(
          booking.user.email
        ) === String(username)
      ) {
        return true;
      }

      return false;
    }
  );

  /* =========================================================
     GET SEATS
  ========================================================= */

  const getSeats = (booking) => {
    if (
      Array.isArray(
        booking.seats
      )
    ) {
      return booking.seats.map(
        (seat) => String(seat)
      );
    }

    if (
      Array.isArray(
        booking.seatDetails
      )
    ) {
      return booking.seatDetails
        .filter(Boolean)
        .map(
          (item) => item.seat
        )
        .filter(Boolean)
        .map(
          (seat) => String(seat)
        );
    }

    if (
      Array.isArray(
        booking.zones
      )
    ) {
      const seats = [];

      booking.zones.forEach(
        (zone) => {
          if (!zone) return;

          if (
            Array.isArray(
              zone.seats
            )
          ) {
            seats.push(
              ...zone.seats
            );
          }
        }
      );

      return seats.map(
        (seat) => String(seat)
      );
    }

    return [];
  };

  /* =========================================================
     GET PRICE
  ========================================================= */

  const getPricePerSeat = (
    booking
  ) => {
    if (
      booking.seatDetails &&
      Array.isArray(
        booking.seatDetails
      ) &&
      booking.seatDetails.length > 0
    ) {
      const prices =
        booking.seatDetails
          .map(
            (item) =>
              Number(
                item?.price || 0
              )
          )
          .filter(
            (price) => price > 0
          );

      if (prices.length > 0) {
        /*
         * ถ้าที่นั่งแต่ละที่ราคาไม่เท่ากัน
         * ไม่แสดงราคาต่อใบแบบหลอก ๆ
         */
        const firstPrice =
          prices[0];

        const samePrice =
          prices.every(
            (price) =>
              price === firstPrice
          );

        if (samePrice) {
          return firstPrice;
        }

        return null;
      }
    }

    if (
      booking.price !==
        undefined &&
      booking.price !== null
    ) {
      return (
        Number(
          booking.price
        ) || 0
      );
    }

    return 0;
  };

  /* =========================================================
     GET TOTAL
  ========================================================= */

  const getTotal = (
    booking
  ) => {
    if (
      booking.total !==
        undefined &&
      booking.total !== null
    ) {
      return (
        Number(
          booking.total
        ) || 0
      );
    }

    if (
      Array.isArray(
        booking.seatDetails
      )
    ) {
      return booking.seatDetails.reduce(
        (sum, item) =>
          sum +
          Number(
            item?.price || 0
          ),
        0
      );
    }

    const seats =
      getSeats(booking);

    const price =
      Number(
        booking.price || 0
      );

    return (
      seats.length * price
    );
  };

  /* =========================================================
     GET STATUS
  ========================================================= */

  const getStatus = (
    booking
  ) => {
    if (booking.status) {
      return String(
        booking.status
      );
    }

    if (
      booking.paymentStatus
    ) {
      return String(
        booking.paymentStatus
      );
    }

    return "Confirmed";
  };

  const getConcertDateStatus = (booking) => {
    const dateKey = String(booking?.date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return "unknown";

    const now = new Date();
    const todayKey = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");

    return dateKey < todayKey ? "completed" : "upcoming";
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (
    date
  ) => {
    if (!date) return "-";

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return String(date);
    }

    return parsed.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };

  /* =========================================================
     CANCEL BOOKING
  ========================================================= */

  const handleCancelBooking = async (
    booking
  ) => {
    if (!booking.firebaseKey) {
      alert(
        "Cannot cancel this booking because its Firebase ID was not found."
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Cancel booking for "${
          booking.concertName ||
          booking.name ||
          "this concert"
        }"?\n\nThe selected seats will become available again.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setCancellingId(
        booking.firebaseKey
      );

      /*
       * ลบ booking ออกจาก Firebase
       * เมื่อถูกลบแล้ว ConcertDetail
       * จะไม่มองว่าที่นั่งนั้นถูกจองอีก
       */
      const bookingRef = ref(
        db,
        `bookings/${booking.firebaseKey}`
      );

      await remove(
        bookingRef
      );

      /*
       * onValue จะโหลดข้อมูลใหม่เอง
       */
      alert(
        "Booking cancelled successfully."
      );
    } catch (error) {
      console.error(
        "Cancel booking error:",
        error
      );

      alert(
        "Unable to cancel booking. Please try again."
      );
    } finally {
      setCancellingId(null);
    }
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="booking-history-page">
        <nav className="navbar">
          <Link
            to="/"
            className="logo"
          >
            Ticket
            <span>Hub</span>
          </Link>
        </nav>

        <main className="booking-history-container">
          <div className="booking-loading">
            <h2>
              Loading bookings...
            </h2>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="booking-history-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

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

          <Link
            to="/booking-history"
            className="active"
          >
            TICKETS
          </Link>

          <Link to="/report">
            REPORT ↗
          </Link>

        </div>

        <div className="nav-user">

          <span className="username">
            Hi,{" "}
            {currentUser?.username ||
              "User"}
          </span>

        </div>

      </nav>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <main className="booking-history-container">

        <div className="booking-history-header">

          <div>

            <p className="section-label">
              ACCOUNT
            </p>

            <h1>
              My Bookings
            </h1>

            <p>
              View and manage your
              concert ticket bookings
            </p>

          </div>

          <Link
            to="/"
            className="back-to-concerts"
          >
            ← Browse Concerts
          </Link>

        </div>

        {/* ===================================================
            EMPTY
        =================================================== */}

        {userBookings.length ===
        0 ? (

          <div className="empty-bookings">

            <div className="empty-icon">
              <span className="ticket-icon" aria-hidden="true">T</span>
            </div>

            <h2>
              No bookings yet
            </h2>

            <p>
              You haven't booked
              any concert tickets.
            </p>

            <Link
              to="/"
              className="primary-button"
            >
              Browse Concerts
            </Link>

          </div>

        ) : (

          <div className="booking-list">

            {userBookings.map(
              (
                booking,
                index
              ) => {

                const seats =
                  getSeats(
                    booking
                  );

                const price =
                  getPricePerSeat(
                    booking
                  );

                const total =
                  getTotal(
                    booking
                  );

                const status =
                  getStatus(
                    booking
                  );

                const isCancelled =
                  status
                    .toLowerCase()
                    .includes(
                      "cancel"
                    );

                const isCancelling =
                  cancellingId ===
                  booking.firebaseKey;

                return (
                  <article
                    className="booking-card"
                    key={
                      booking.firebaseKey ||
                      booking.bookingId ||
                      index
                    }
                  >

                    {/* =====================================
                        IMAGE
                    ===================================== */}

                    <div className="booking-card-image">

                      {booking.image ? (

                        <img
                          src={
                            booking.image
                          }
                          alt={
                            booking.concertName ||
                            "Concert"
                          }
                          loading="lazy"
                          decoding="async"
                          onError={(
                            event
                          ) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />

                      ) : (

                        <div className="booking-no-image">
                          TICKET
                        </div>

                      )}

                    </div>

                    {/* =====================================
                        CONTENT
                    ===================================== */}

                    <div className="booking-card-content">

                      <div className="booking-card-top">

                        <div>

                          <p className="booking-label">
                            BOOKING
                          </p>

                          <h2>
                            {
                              booking.concertName ||
                              booking.name ||
                              "Concert"
                            }
                          </h2>

                          <h3>
                            {
                              booking.artist ||
                              ""
                            }
                          </h3>

                        </div>

                        <span
                          className={`booking-status ${status
                            .toLowerCase()
                            .replace(
                              /\s+/g,
                              "-"
                            )}`}
                        >
                          {status}
                        </span>

                        <span className={`event-date-status ${getConcertDateStatus(booking)}`}>
                          {getConcertDateStatus(booking) === "completed"
                            ? "Concert completed"
                            : getConcertDateStatus(booking) === "upcoming"
                              ? "Upcoming concert"
                              : "Event date unavailable"}
                        </span>

                      </div>

                      {/* =================================
                          DETAILS
                      ================================= */}

                      <div className="booking-details">

                        <div className="booking-detail">

                          <span>
                            Date
                          </span>

                          <strong>
                            {formatDate(
                              booking.date
                            )}
                          </strong>

                        </div>

                        <div className="booking-detail">

                          <span>
                            Venue
                          </span>

                          <strong>
                            {
                              booking.venue ||
                              "-"
                            }
                          </strong>

                        </div>

                        <div className="booking-detail">

                          <span>
                            Seats
                          </span>

                          <strong>
                            {seats.length >
                            0
                              ? seats.join(
                                  ", "
                                )
                              : "-"}
                          </strong>

                        </div>

                        <div className="booking-detail">

                          <span>
                            Quantity
                          </span>

                          <strong>
                            {seats.length}
                          </strong>

                        </div>

                      </div>

                      {/* =================================
                          PRICE
                      ================================= */}

                      <div className="booking-card-bottom">

                        <div className="booking-price-info">

                          <span>
                            Price
                          </span>

                          <strong>
                            {price ===
                            null
                              ? "Different prices"
                              : `฿${price.toLocaleString()}`}
                          </strong>

                        </div>

                        <div className="booking-total-info">

                          <span>
                            Total
                          </span>

                          <strong>
                            ฿
                            {total.toLocaleString()}
                          </strong>

                        </div>

                      </div>

                      {/* =================================
                          CANCEL
                      ================================= */}

                      {!isCancelled && (
                        <div className="booking-card-actions">

                          <button
                            type="button"
                            className="cancel-booking-button"
                            onClick={() =>
                              handleCancelBooking(
                                booking
                              )
                            }
                            disabled={
                              isCancelling
                            }
                          >
                            {isCancelling
                              ? "Cancelling..."
                              : "Cancel Booking"}
                          </button>

                        </div>
                      )}

                    </div>

                  </article>
                );
              }
            )}

          </div>

        )}

      </main>

    </div>
  );
}

export default BookingHistory;

