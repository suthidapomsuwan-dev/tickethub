import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

function ConcertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [concert, setConcert] = useState(null);
  const [selectedZone, setSelectedZone] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);

  // =========================
  // LOAD CONCERT
  // =========================

  useEffect(() => {
    const saved = localStorage.getItem("ticketHubConcerts");

    if (!saved) {
      setConcert(null);
      return;
    }

    try {
      const concerts = JSON.parse(saved);

      const found = concerts.find(
        (item) => String(item.id) === String(id)
      );

      setConcert(found || null);
    } catch (error) {
      console.error("Cannot load concerts:", error);
      setConcert(null);
    }
  }, [id]);

  // =========================
  // SELECT ZONE
  // =========================

  const handleZoneSelect = (zone) => {
    setSelectedZone(zone);
    setSelectedSeats([]);
  };

  // =========================
  // CREATE SEATS
  // DEFAULT = 3 ROWS × 10 SEATS
  // =========================

  const createSeats = () => {
    if (!selectedZone) return [];

    const rows = Number(selectedZone.rows) || 3;
    const seatsPerRow =
      Number(selectedZone.seatsPerRow) || 10;

    const seats = [];

    for (let row = 0; row < rows; row++) {
      const rowLetter = String.fromCharCode(65 + row);

      for (let seat = 1; seat <= seatsPerRow; seat++) {
        seats.push(`${rowLetter}${seat}`);
      }
    }

    return seats;
  };

  // =========================
  // GET BOOKED SEATS
  // =========================

  const getBookedSeats = () => {
    try {
      const bookings =
        JSON.parse(
          localStorage.getItem("ticketHubBookings")
        ) || [];

      if (!concert || !selectedZone) {
        return [];
      }

      const booked = [];

      bookings.forEach((booking) => {
        if (
          String(booking.concertId) === String(concert.id) &&
          String(booking.zoneId) === String(selectedZone.id)
        ) {
          if (Array.isArray(booking.seats)) {
            booked.push(...booking.seats);
          }
        }
      });

      return booked;
    } catch (error) {
      console.error(
        "Cannot load booked seats:",
        error
      );

      return [];
    }
  };

  // =========================
  // SELECT SEAT
  // =========================

  const toggleSeat = (seat) => {
    const bookedSeats = getBookedSeats();

    if (bookedSeats.includes(seat)) {
      return;
    }

    setSelectedSeats((current) => {
      if (current.includes(seat)) {
        return current.filter(
          (item) => item !== seat
        );
      }

      return [...current, seat];
    });
  };

  // =========================
  // GO TO PAYMENT
  // =========================

  const handleBooking = () => {
    if (!selectedZone) {
      alert("กรุณาเลือกโซน");
      return;
    }

    if (selectedSeats.length === 0) {
      alert("กรุณาเลือกที่นั่งอย่างน้อย 1 ที่นั่ง");
      return;
    }

    // ตรวจสอบที่นั่งอีกครั้งก่อนชำระเงิน
    const bookedSeats = getBookedSeats();

    const alreadyBooked = selectedSeats.filter(
      (seat) => bookedSeats.includes(seat)
    );

    if (alreadyBooked.length > 0) {
      alert(
        `ที่นั่ง ${alreadyBooked.join(
          ", "
        )} ถูกจองไปแล้ว`
      );

      setSelectedSeats((current) =>
        current.filter(
          (seat) => !alreadyBooked.includes(seat)
        )
      );

      return;
    }

    const price =
      Number(selectedZone.price) || 0;

    const bookingData = {
      concertId: concert.id,
      concertName: concert.name,
      artist: concert.artist,
      date: concert.date,
      venue: concert.venue,

      image: concert.image || "",

      zone: selectedZone.name,
      zoneId: selectedZone.id,

      price: price,

      seats: selectedSeats,

      total:
        selectedSeats.length * price
    };

    // เก็บข้อมูลการจองปัจจุบัน
    localStorage.setItem(
      "ticketHubCurrentBooking",
      JSON.stringify(bookingData)
    );

    // ส่งข้อมูลไป Payment ผ่าน state
    navigate("/payment", {
      state: bookingData
    });
  };

  // =========================
  // NOT FOUND
  // =========================

  if (!concert) {
    return (
      <div className="not-found-page">
        <h1>Concert not found</h1>

        <Link to="/">
          Back to concerts
        </Link>
      </div>
    );
  }

  const seats = createSeats();
  const bookedSeats = getBookedSeats();

  const total =
    selectedSeats.length *
    Number(selectedZone?.price || 0);

  // =========================
  // PAGE
  // =========================

  return (
    <div className="concert-detail-page">

      {/* =========================
          NAVBAR
      ========================= */}

      <nav className="navbar">

        <Link
          to="/"
          className="logo"
        >
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

        <div className="nav-user">

          <span className="username">
            Hi,{" "}
            {JSON.parse(
              localStorage.getItem(
                "ticketHubUser"
              )
            )?.username || "User"}
          </span>

          <Link
            to="/booking-history"
            className="nav-booking-button"
          >
            My Bookings
          </Link>

        </div>

      </nav>


      {/* =========================
          CONCERT INFO
      ========================= */}

      <main className="concert-detail-container">

        <div className="detail-image">

          {concert.image ? (
            <img
              src={concert.image}
              alt={concert.name}
            />
          ) : (
            <div className="no-image">
              NO IMAGE
            </div>
          )}

        </div>


        <div className="detail-info">

          <p className="section-label">
            {concert.id}
          </p>

          <h1>
            {concert.name}
          </h1>

          <h2>
            {concert.artist}
          </h2>

          <p>
            📅 {concert.date}
          </p>

          <p>
            📍 {concert.venue}
          </p>

        </div>

      </main>


      {/* =========================
          ZONE
      ========================= */}

      <section className="booking-section">

        <div className="booking-heading">

          <div>

            <p className="section-label">
              BOOKING
            </p>

            <h2>
              Select Your Zone
            </h2>

          </div>

          <span>
            Choose your preferred seating area
          </span>

        </div>


        <div className="zone-list">

          {(concert.zones || []).map(
            (zone) => (

              <button
                type="button"
                className={
                  selectedZone?.id === zone.id
                    ? "zone-card selected"
                    : "zone-card"
                }
                key={zone.id}
                onClick={() =>
                  handleZoneSelect(zone)
                }
              >

                <strong>
                  {zone.name}
                </strong>

                <span>
                  ฿
                  {Number(
                    zone.price || 0
                  ).toLocaleString()}
                  {" / seat"}
                </span>

                <small>
                  {zone.rows || 3} rows ×{" "}
                  {zone.seatsPerRow || 10} seats
                </small>

              </button>

            )
          )}

        </div>

      </section>


      {/* =========================
          SEAT SELECTION
      ========================= */}

      {selectedZone && (

        <section className="seat-section">

          <div className="seat-heading">

            <div>

              <p className="section-label">
                SEATS
              </p>

              <h2>
                Select Your Seats
              </h2>

            </div>

          </div>


          {/* STAGE */}

          <div className="stage">
            STAGE
          </div>


          {/* SEAT MAP */}

          <div className="seat-map">

            {seats.map((seat) => {

              const isSelected =
                selectedSeats.includes(
                  seat
                );

              const isBooked =
                bookedSeats.includes(
                  seat
                );

              return (
                <button
                  type="button"
                  key={seat}
                  disabled={isBooked}
                  className={
                    isBooked
                      ? "seat booked"
                      : isSelected
                      ? "seat selected"
                      : "seat"
                  }
                  onClick={() =>
                    toggleSeat(seat)
                  }
                >
                  {seat}
                </button>
              );

            })}

          </div>


          {/* LEGEND */}

          <div className="seat-legend">

            <span>
              <i className="legend-seat"></i>
              Available
            </span>

            <span>
              <i className="legend-seat selected"></i>
              Selected
            </span>

            <span>
              <i className="legend-seat booked"></i>
              Booked
            </span>

          </div>


          {/* SUMMARY */}

          <div className="booking-summary">

            <div>

              <span>
                Selected Seats
              </span>

              <strong>
                {selectedSeats.length > 0
                  ? selectedSeats.join(", ")
                  : "None"}
              </strong>

            </div>


            <div>

              <span>
                Total
              </span>

              <strong className="booking-total">
                ฿
                {total.toLocaleString()}
              </strong>

            </div>


            <button
              type="button"
              className="primary-button booking-button"
              onClick={handleBooking}
              disabled={
                selectedSeats.length === 0
              }
            >
              Continue to Payment →
            </button>

          </div>

        </section>

      )}

    </div>
  );
}

export default ConcertDetail;