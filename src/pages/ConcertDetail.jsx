import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

function ConcertDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [concert, setConcert] = useState(null);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =========================================================
     LOAD CONCERT
  ========================================================= */

  useEffect(() => {
    const concertsRef = ref(db, "concerts");

    const unsubscribe = onValue(
      concertsRef,
      (snapshot) => {
        const data = snapshot.val();

        if (!data) {
          setConcert(null);
          setLoading(false);
          return;
        }

        const concerts = Array.isArray(data)
          ? data
          : Object.values(data);

        const found = concerts.find(
          (item) => String(item?.id) === String(id)
        );

        if (!found) {
          setConcert(null);
          setLoading(false);
          return;
        }

        const rawZones = Array.isArray(found.zones)
          ? found.zones
          : Object.values(found.zones || {});

        /*
         * แต่ละ Zone จะเก็บ rows / seatsPerRow ของตัวเอง
         *
         * เช่น
         *
         * VIP
         * rows = 2
         * seatsPerRow = 8
         *
         * A
         * rows = 3
         * seatsPerRow = 10
         */

        const normalizedZones = rawZones
          .filter(Boolean)
          .map((zone, index) => ({
            ...zone,

            id:
              zone.id !== undefined &&
              zone.id !== null
                ? String(zone.id)
                : `ZONE-${index + 1}`,

            name:
              zone.name ||
              zone.id ||
              `Zone ${index + 1}`,

            price: Number(zone.price) || 0,

            rows: Math.max(
              1,
              Number(zone.rows) || 3
            ),

            seatsPerRow: Math.max(
              1,
              Number(zone.seatsPerRow) || 10
            ),
          }));

        /*
         * ถ้าไม่มี Zone
         * สร้าง Zone A ให้
         */

        if (normalizedZones.length === 0) {
          normalizedZones.push({
            id: "A",
            name: "Regular A",
            price: Number(found.price) || 0,
            rows: 5,
            seatsPerRow: 10,
          });
        }

        const normalizedConcert = {
          ...found,
          price: Number(found.price) || 0,
          zones: normalizedZones,
        };

        console.log(
          "Loaded concert:",
          normalizedConcert
        );

        setConcert(normalizedConcert);
        setLoading(false);
      },
      (error) => {
        console.error(
          "Cannot load concerts:",
          error
        );

        setConcert(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id]);

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
          return;
        }

        const bookingList = Array.isArray(data)
          ? data
          : Object.values(data);

        setBookings(
          bookingList.filter(Boolean)
        );
      },
      (error) => {
        console.error(
          "Cannot load bookings:",
          error
        );

        setBookings([]);
      }
    );

    return () => unsubscribe();
  }, []);

  /* =========================================================
     CREATE SEATS FOR EACH ZONE
  ========================================================= */

  const createZoneSeats = (zone) => {
    if (!zone) return [];

    const rows = Math.max(
      1,
      Number(zone.rows) || 1
    );

    const seatsPerRow = Math.max(
      1,
      Number(zone.seatsPerRow) || 1
    );

    const seats = [];

    for (let row = 0; row < rows; row++) {
      const rowLetter =
        String.fromCharCode(65 + row);

      for (
        let seat = 1;
        seat <= seatsPerRow;
        seat++
      ) {
        seats.push({
          seat: `${rowLetter}${seat}`,
          zoneId: String(zone.id),
          zoneName: zone.name,
          price: Number(zone.price) || 0,
        });
      }
    }

    return seats;
  };

  /* =========================================================
     ALL ZONE SEATS
  ========================================================= */

  const allZoneSeats =
    concert?.zones?.map((zone) => ({
      zone,
      seats: createZoneSeats(zone),
    })) || [];

  /* =========================================================
     GET BOOKED SEATS
  ========================================================= */

  const getBookedSeats = () => {
    if (!concert) return [];

    const booked = [];

    bookings.forEach((booking) => {
      if (!booking) return;

      const bookingConcertId =
        booking.concertId ??
        booking.concertID ??
        booking.eventId;

      if (
        String(bookingConcertId) !==
        String(concert.id)
      ) {
        return;
      }

      /* =====================================================
         FORMAT 1
         seats: ["A1", "A2"]
      ===================================================== */

      if (Array.isArray(booking.seats)) {
        booking.seats.forEach((seat) => {
          if (typeof seat === "object") {
            if (seat.seat) {
              booked.push({
                zoneId:
                  seat.zoneId ??
                  seat.zone ??
                  null,
                seat: String(seat.seat),
              });
            }
          } else {
            booked.push({
              zoneId:
                booking.zoneId ??
                booking.zone ??
                null,
              seat: String(seat),
            });
          }
        });
      }

      /* =====================================================
         FORMAT 2
         seat: "A1"
      ===================================================== */

      if (booking.seat) {
        booked.push({
          zoneId:
            booking.zoneId ??
            booking.zone ??
            null,
          seat: String(booking.seat),
        });
      }

      /* =====================================================
         FORMAT 3
         seatDetails
      ===================================================== */

      if (Array.isArray(booking.seatDetails)) {
        booking.seatDetails.forEach(
          (detail) => {
            if (!detail) return;

            if (detail.seat) {
              booked.push({
                zoneId:
                  detail.zoneId ??
                  detail.zone ??
                  booking.zoneId ??
                  booking.zone ??
                  null,

                seat: String(detail.seat),
              });
            }
          }
        );
      }

      /* =====================================================
         FORMAT 4
         zones array
      ===================================================== */

      if (Array.isArray(booking.zones)) {
        booking.zones.forEach((zone) => {
          if (!zone) return;

          const zoneId =
            zone.zoneId ??
            zone.id ??
            zone.zone ??
            null;

          if (Array.isArray(zone.seats)) {
            zone.seats.forEach((seat) => {
              if (typeof seat === "object") {
                if (seat.seat) {
                  booked.push({
                    zoneId:
                      seat.zoneId ??
                      zoneId,
                    seat: String(seat.seat),
                  });
                }
              } else {
                booked.push({
                  zoneId,
                  seat: String(seat),
                });
              }
            });
          }

          if (zone.seat) {
            booked.push({
              zoneId,
              seat: String(zone.seat),
            });
          }
        });
      }

      /* =====================================================
         FORMAT 5
         zones object
      ===================================================== */

      if (
        booking.zones &&
        typeof booking.zones === "object" &&
        !Array.isArray(booking.zones)
      ) {
        Object.entries(
          booking.zones
        ).forEach(([zoneKey, zone]) => {
          if (!zone) return;

          if (Array.isArray(zone.seats)) {
            zone.seats.forEach((seat) => {
              booked.push({
                zoneId:
                  zone.zoneId ??
                  zone.id ??
                  zoneKey,

                seat:
                  typeof seat === "object"
                    ? String(
                        seat.seat || ""
                      )
                    : String(seat),
              });
            });
          }

          if (zone.seat) {
            booked.push({
              zoneId:
                zone.zoneId ??
                zone.id ??
                zoneKey,

              seat: String(zone.seat),
            });
          }
        });
      }
    });

    return booked.filter(
      (item) => item.seat
    );
  };

  const bookedSeats = getBookedSeats();

  /* =========================================================
     CHECK BOOKED
  ========================================================= */

  const isSeatBooked = (
    zoneId,
    seatName
  ) => {
    return bookedSeats.some((item) => {
      const sameSeat =
        String(item.seat) ===
        String(seatName);

      /*
       * ถ้ามี zoneId
       * ต้องตรงทั้ง Zone และ Seat
       */

      if (item.zoneId) {
        return (
          sameSeat &&
          String(item.zoneId) ===
            String(zoneId)
        );
      }

      /*
       * Booking เก่าไม่มี Zone
       * ใช้ชื่อ Seat อย่างเดียว
       */

      return sameSeat;
    });
  };

  /* =========================================================
     GET ZONE PRICE
  ========================================================= */

  const getZonePrice = (zoneId) => {
    const zone = concert?.zones?.find(
      (item) =>
        String(item.id) ===
        String(zoneId)
    );

    return Number(zone?.price) || 0;
  };

  /* =========================================================
     TOGGLE SEAT
  ========================================================= */

  const toggleSeat = (
    zone,
    seatName
  ) => {
    const zoneId = String(zone.id);
    const seat = String(seatName);

    if (
      isSeatBooked(
        zoneId,
        seat
      )
    ) {
      return;
    }

    setSelectedSeats((current) => {
      const exists = current.some(
        (item) =>
          String(item.zoneId) ===
            zoneId &&
          String(item.seat) ===
            seat
      );

      /*
       * กดซ้ำ = ยกเลิก
       */

      if (exists) {
        return current.filter(
          (item) =>
            !(
              String(item.zoneId) ===
                zoneId &&
              String(item.seat) ===
                seat
            )
        );
      }

      /*
       * เพิ่มที่นั่ง
       *
       * ราคาเอาจาก Zone
       */

      return [
        ...current,
        {
          key: `${zoneId}-${seat}`,
          zoneId,
          zoneName:
            zone.name,
          seat,
          price:
            getZonePrice(
              zoneId
            ),
        },
      ];
    });
  };

  /* =========================================================
     GO TO PAYMENT
  ========================================================= */

  const handleBooking = () => {
    if (
      selectedSeats.length ===
      0
    ) {
      alert(
        "Please select at least one seat."
      );

      return;
    }

    /*
     * เช็กที่นั่งล่าสุด
     */

    const latestBooked =
      getBookedSeats();

    const alreadyBooked =
      selectedSeats.filter(
        (selected) =>
          latestBooked.some(
            (booked) => {
              const sameSeat =
                String(
                  booked.seat
                ) ===
                String(
                  selected.seat
                );

              const sameZone =
                !booked.zoneId ||
                String(
                  booked.zoneId
                ) ===
                  String(
                    selected.zoneId
                  );

              return (
                sameSeat &&
                sameZone
              );
            }
          )
      );

    if (
      alreadyBooked.length >
      0
    ) {
      alert(
        `These seats have already been booked:\n${alreadyBooked
          .map(
            (item) =>
              `${item.zoneName} - ${item.seat}`
          )
          .join("\n")}`
      );

      setSelectedSeats(
        (current) =>
          current.filter(
            (selected) =>
              !alreadyBooked.some(
                (item) =>
                  String(
                    item.seat
                  ) ===
                    String(
                      selected.seat
                    ) &&
                  String(
                    item.zoneId
                  ) ===
                    String(
                      selected.zoneId
                    )
              )
          )
      );

      return;
    }

    /* =====================================================
       SEAT DETAILS
    ===================================================== */

    const seatDetails =
      selectedSeats.map(
        (selected) => ({
          seat:
            selected.seat,

          zoneId:
            selected.zoneId,

          zoneName:
            selected.zoneName,

          price:
            Number(
              selected.price
            ) || 0,
        })
      );

    /* =====================================================
       TOTAL
    ===================================================== */

    const total =
      selectedSeats.reduce(
        (sum, seat) =>
          sum +
          (Number(
            seat.price
          ) || 0),
        0
      );

    /*
     * ราคาแรกเอาไว้ compatibility
     * แต่ราคาจริงใช้ seatDetails
     */

    const firstPrice =
      Number(
        selectedSeats[0]?.price
      ) || 0;

    /* =====================================================
       BOOKING DATA
    ===================================================== */

    const bookingData = {
      concertId:
        concert.id,

      concertName:
        concert.name,

      artist:
        concert.artist,

      date:
        concert.date,

      venue:
        concert.venue,

      image:
        concert.image || "",

      /*
       * รายการ Seat
       */

      seats:
        selectedSeats.map(
          (selected) =>
            selected.seat
        ),

      /*
       * Zone ของแต่ละ Seat
       */

      seatDetails,

      /*
       * ถ้าเลือก Zone เดียว
       * จะเก็บ zone หลักไว้ด้วย
       */

      zoneId:
        selectedSeats.length ===
          1 ||
        selectedSeats.every(
          (seat) =>
            String(
              seat.zoneId
            ) ===
            String(
              selectedSeats[0]
                .zoneId
            )
        )
          ? selectedSeats[0]
              .zoneId
          : null,

      zoneName:
        selectedSeats.length ===
          1 ||
        selectedSeats.every(
          (seat) =>
            String(
              seat.zoneId
            ) ===
            String(
              selectedSeats[0]
                .zoneId
            )
        )
          ? selectedSeats[0]
              .zoneName
          : null,

      /*
       * ราคาต่อใบ
       */

      price:
        firstPrice,

      /*
       * จำนวน
       */

      quantity:
        selectedSeats.length,

      /*
       * ยอดรวม
       */

      total,
    };

    console.log(
      "Current booking:",
      bookingData
    );

    localStorage.setItem(
      "ticketHubCurrentBooking",
      JSON.stringify(
        bookingData
      )
    );

    navigate(
      "/payment",
      {
        state:
          bookingData,
      }
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="not-found-page">
        <h1>
          Loading...
        </h1>
      </div>
    );
  }

  /* =========================================================
     NOT FOUND
  ========================================================= */

  if (!concert) {
    return (
      <div className="not-found-page">
        <h1>
          Concert not found
        </h1>

        <Link to="/">
          Back to concerts
        </Link>
      </div>
    );
  }

  /* =========================================================
     USER
  ========================================================= */

  let currentUser =
    null;

  try {
    currentUser =
      JSON.parse(
        localStorage.getItem(
          "ticketHubUser"
        )
      );
  } catch {
    currentUser =
      null;
  }

  /* =========================================================
     TOTAL
  ========================================================= */

  const total =
    selectedSeats.reduce(
      (sum, seat) =>
        sum +
        (Number(
          seat.price
        ) || 0),
      0
    );

  /* =========================================================
     AVAILABLE
  ========================================================= */

  const totalSeats =
    allZoneSeats.reduce(
      (sum, zoneData) =>
        sum +
        zoneData.seats.length,
      0
    );

  const bookedForConcert =
    bookedSeats.filter(
      (booked) =>
        booked.seat
    );

  const availableSeats =
    Math.max(
      0,
      totalSeats -
        bookedForConcert.length
    );

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="concert-detail-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <nav className="navbar">

        <Link
          to="/"
          className="logo"
        >
          Ticket
          <span>
            Hub
          </span>
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
            {currentUser?.username ||
              "User"}
          </span>

          <Link
            to="/booking-history"
            className="nav-booking-button"
          >
            My Bookings
          </Link>

        </div>

      </nav>

      {/* =====================================================
          CONCERT INFO
      ===================================================== */}

      <main className="concert-detail-container">

        <div className="detail-image">

          {concert.image ? (
            <img
              src={concert.image}
              alt={
                concert.name ||
                "Concert"
              }
              onError={(e) => {
                e.currentTarget.style.display =
                  "none";
              }}
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
            📅{" "}
            {concert.date}
          </p>

          <p>
            📍{" "}
            {concert.venue}
          </p>

          {concert.description && (
            <p className="concert-description">
              {concert.description}
            </p>
          )}

        </div>

      </main>

      {/* =====================================================
          BOOKING
      ===================================================== */}

      <section className="booking-section">

        <div className="booking-heading">

          <div>

            <p className="section-label">
              BOOKING
            </p>

            <h2>
              Select Your Seats
            </h2>

          </div>

          <span>
            {availableSeats}{" "}
            seats available
          </span>

        </div>

        {/* ===================================================
            STAGE — มีแค่ครั้งเดียว
        =================================================== */}

        <div className="stage-wrapper">

          <div className="stage">
            STAGE
          </div>

          <div className="stage-line"></div>

        </div>

        {/* ===================================================
            ZONES
        =================================================== */}

        <div className="all-zones">

          {allZoneSeats.map(
            (
              zoneData,
              zoneIndex
            ) => {

              const {
                zone,
                seats,
              } = zoneData;

              const zoneId =
                String(
                  zone.id
                );

              const zoneBooked =
                seats.filter(
                  (seatData) =>
                    isSeatBooked(
                      zoneId,
                      seatData.seat
                    )
                ).length;

              const zoneAvailable =
                seats.length -
                zoneBooked;

              return (
                <div
                  className={`zone-section zone-position-${zoneIndex}`}
                  key={zoneId}
                >

                  {/* ================================
                      ZONE HEADER
                  ================================= */}

                  <div className="zone-header">

                    <div className="zone-title">

                      <span className="zone-label">
                        ZONE
                      </span>

                      <h3>
                        {zone.name}
                      </h3>

                      <span className="zone-price">
                        ฿
                        {Number(
                          zone.price
                        ).toLocaleString()}
                      </span>

                    </div>

                    <div className="zone-availability">

                      <strong>
                        {
                          zoneAvailable
                        }
                      </strong>

                      <span>
                        /{" "}
                        {
                          seats.length
                        }{" "}
                        available
                      </span>

                    </div>

                  </div>

                  {/* ================================
                      SEAT MAP ของ ZONE นี้
                  ================================= */}

                  <div className="zone-seat-area">

                    <div
                      className="seat-map zone-seat-map"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(
                          Number(
                            zone.seatsPerRow
                          ) || 1,
                          12
                        )}, 64px)`,
                      }}
                    >

                      {seats.map(
                        (
                          seatData
                        ) => {

                          const seat =
                            seatData.seat;

                          const isBooked =
                            isSeatBooked(
                              zoneId,
                              seat
                            );

                          const isSelected =
                            selectedSeats.some(
                              (
                                item
                              ) =>
                                String(
                                  item.zoneId
                                ) ===
                                  zoneId &&
                                String(
                                  item.seat
                                ) ===
                                  seat
                            );

                          let seatClass =
                            "seat";

                          if (
                            isBooked
                          ) {
                            seatClass =
                              "seat booked";
                          } else if (
                            isSelected
                          ) {
                            seatClass =
                              "seat selected";
                          }

                          return (
                            <button
                              type="button"
                              key={`${zoneId}-${seat}`}
                              disabled={
                                isBooked
                              }
                              title={
                                isBooked
                                  ? `${seat} - Booked`
                                  : `${seat} - ${zone.name}`
                              }
                              className={
                                seatClass
                              }
                              onClick={() =>
                                toggleSeat(
                                  zone,
                                  seat
                                )
                              }
                            >

                              {/* ไม่มีราคา */}
                              <span className="seat-name">
                                {seat}
                              </span>

                            </button>
                          );
                        }
                      )}

                    </div>

                  </div>

                </div>
              );
            }
          )}

        </div>

        {/* ===================================================
            LEGEND
        =================================================== */}

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

        {/* ===================================================
            BOOKING SUMMARY
        =================================================== */}

        <div className="booking-summary">

          {/* SELECTED SEATS */}

          <div className="summary-seats">

            <span>
              Selected Seats
            </span>

            {selectedSeats.length >
            0 ? (

              <div className="selected-seat-list">

                {selectedSeats.map(
                  (
                    selected
                  ) => (

                    <div
                      className="selected-seat-item"
                      key={
                        selected.key
                      }
                    >

                      <div>

                        <strong>
                          {
                            selected.seat
                          }
                        </strong>

                        <small>
                          {
                            selected.zoneName
                          }
                        </small>

                      </div>

                      <span>
                        ฿
                        {Number(
                          selected.price
                        ).toLocaleString()}
                      </span>

                    </div>

                  )
                )}

              </div>

            ) : (

              <strong>
                None
              </strong>

            )}

          </div>

          {/* TOTAL */}

          <div className="summary-total">

            <span>
              Total
            </span>

            <strong className="booking-total">
              ฿
              {total.toLocaleString()}
            </strong>

          </div>

          {/* ACTION */}

          <div className="booking-actions">

            <button
              type="button"
              className="primary-button booking-button"
              onClick={
                handleBooking
              }
              disabled={
                selectedSeats.length ===
                0
              }
            >
              Continue to Payment →
            </button>

          </div>

        </div>

      </section>

    </div>
  );
}

export default ConcertDetail;