import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { canBookConcert, formatConcertDate, isConcertPast } from "../utils/concertDate";

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
    const concertRef = ref(db, `concerts/${id}`);

    const unsubscribe = onValue(
      concertRef,
      (snapshot) => {
        const found = snapshot.val();
        if (!found || String(found.id) !== String(id)) {
          setConcert(null);
          setLoading(false);
          return;
        }

        const rawZones = Array.isArray(found.zones)
          ? found.zones
          : Object.values(found.zones || {});

        const normalizedZones = rawZones
          .filter(Boolean)
          .filter((zone) => zone.id !== undefined && zone.id !== null)
          .map((zone) => ({
            ...zone,

            id: String(zone.id),

            name:
              zone.name ||
              String(zone.id),

            price: Number(zone.price) || 0,
            // Keep the seat-capacity defaults used by the previously working booking flow.
            rows: Math.max(1, Number(zone.rows) || 3),
            seatsPerRow: Math.max(1, Number(zone.seatsPerRow) || 10),
            seatIds: Array.isArray(zone.seatIds)
              ? [...new Set(zone.seatIds.map((seat) => String(seat).trim()).filter(Boolean))]
              : typeof zone.seatIds === "string"
                ? [...new Set(zone.seatIds.split(/[\n,]/).map((seat) => seat.trim()).filter(Boolean))]
                : zone.seatIds && typeof zone.seatIds === "object"
                  ? zone.seatIds
                  : [],
          }));

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

        const bookingList = Array.isArray(data) ? data : Object.values(data);

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

    let configuredSeats = Array.isArray(zone.seatIds)
      ? zone.seatIds.map((seat) => ({ seat }))
      : typeof zone.seatIds === "string"
        ? zone.seatIds.split(/[\n,]/).map((seat) => ({ seat }))
        : zone.seatIds && typeof zone.seatIds === "object"
          ? Object.entries(zone.seatIds).map(([key, entry]) => typeof entry === "object" && entry !== null
              ? { seat: entry.seatId ?? entry.seat ?? entry.id ?? key, status: entry.status }
              : { seat: key, status: typeof entry === "string" ? entry : undefined })
        : Array.isArray(zone.seats)
          ? zone.seats.map((entry, index) => typeof entry === "object" && entry !== null
              ? { seat: entry.seatId ?? entry.seat ?? entry.id ?? index, status: entry.status }
              : { seat: entry })
          : zone.seats && typeof zone.seats === "object"
            ? Object.entries(zone.seats).map(([key, entry]) => typeof entry === "object" && entry !== null
                ? { seat: entry.seatId ?? entry.seat ?? entry.id ?? key, status: entry.status }
                : { seat: key, status: typeof entry === "string" ? entry : undefined })
            : [];

    // Preserve the previously used 3 × 10 seat fallback for each real configured zone.
    // Do not create a fallback zone when a concert has no zone records.
    const rowCount = Number(zone.rows);
    const seatsPerRow = Number(zone.seatsPerRow);
    if (configuredSeats.length === 0 && Number.isInteger(rowCount) && rowCount > 0 && Number.isInteger(seatsPerRow) && seatsPerRow > 0) {
      configuredSeats = Array.from({ length: rowCount }, (_, rowIndex) =>
        Array.from({ length: seatsPerRow }, (_, seatIndex) => ({ seat: `${String.fromCharCode(65 + rowIndex)}${seatIndex + 1}` }))
      ).flat();
    }

    const normalizedSeats = configuredSeats
      .map(({ seat, status }) => ({ seat: String(seat ?? "").trim(), status: String(status || "").toLowerCase() }))
      .filter((entry) => entry.seat);
    const uniqueSeats = [...new Map(normalizedSeats.map((entry) => [entry.seat, entry])).values()];

    return uniqueSeats
      .map(({ seat, status }) => ({
        seat,
        zoneId: String(zone.id),
        zoneName: zone.name,
        price: Number(zone.price) || 0,
        status,
      }));
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

      const status = String(booking.status || booking.paymentStatus || "").toLowerCase();
      if (["cancelled", "canceled", "failed", "refunded"].some((inactive) => status.includes(inactive))) return;

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

    const uniqueBookedSeats = new Map();
    booked.filter((item) => item.seat).forEach((item) => {
      const key = `${item.zoneId ?? ""}:${item.seat}`;
      uniqueBookedSeats.set(key, item);
    });
    return [...uniqueBookedSeats.values()];
  };

  const bookedSeats = getBookedSeats();

  /* =========================================================
     CHECK BOOKED
  ========================================================= */

  const isSeatBooked = (
    zoneId,
    seatName,
    seatStatus
  ) => {
    if (["booked", "sold", "confirmed", "reserved", "paid", "unavailable"].includes(String(seatStatus || "").toLowerCase())) return true;
    const currentZone = concert?.zones?.find((item) => String(item.id) === String(zoneId));
    const zoneAliases = new Set([String(zoneId), currentZone?.name].filter(Boolean));
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
          zoneAliases.has(String(item.zoneId))
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
    if (!canBookConcert(concert?.date)) return;

    const zoneId = String(zone.id);
    const seat = String(seatName);
    const configuredSeatStatus = allZoneSeats
      .find((zoneData) => String(zoneData.zone.id) === zoneId)
      ?.seats.find((seatData) => seatData.seat === seat)?.status;

    if (
      isSeatBooked(
        zoneId,
        seat,
        configuredSeatStatus
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
    if (!canBookConcert(concert?.date)) {
      alert(isConcertPast(concert?.date) ? "This concert has ended. Seat booking is closed." : "This concert date is unavailable for booking.");
      return;
    }

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

  const canBook = canBookConcert(concert.date);
  const eventEnded = isConcertPast(concert.date);

  /* =========================================================
     USER
  ========================================================= */

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("ticketHubUser"));
    } catch {
      return null;
    }
  })();

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

  const availableSeats = allZoneSeats.reduce(
                    (sum, zoneData) => sum + zoneData.seats.filter((item) => !isSeatBooked(zoneData.zone.id, item.seat, item.status)).length,
    0
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
            REPORT
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
            TICKETS
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

          <p>{formatConcertDate(concert.date)}</p>

          <p>{concert.venue}</p>

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

      <section className={`booking-section${canBook ? "" : " booking-section--closed"}`}>

        {!canBook && (
          <div className="event-ended-notice" role="status">
            <strong>{eventEnded ? "EVENT ENDED" : "BOOKING UNAVAILABLE"}</strong>
            <span>{eventEnded ? "Seat selection and ticket booking are closed for this event." : "A valid event date is required before seats can be booked."}</span>
          </div>
        )}

        <div className="booking-heading">

          <div>

            <p className="section-label">
              BOOKING
            </p>

            <h2>
              SELECT YOUR SEATS
            </h2>

          </div>

          <span role="status">
            {!canBook
              ? eventEnded ? "EVENT ENDED" : "BOOKING UNAVAILABLE"
              : totalSeats === 0
                ? "ยังไม่เปิดให้จองในขณะนี้"
                : availableSeats === 0
                  ? "SOLD OUT"
                  : `${availableSeats} seats available`}
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

        {totalSeats > 0 && <p className="seat-map-disclaimer">
          Seat IDs and capacity use the event configuration. The displayed layout is illustrative; an official venue seating plan was not provided.
        </p>}

        {/* ===================================================
            ZONES
        =================================================== */}

        {allZoneSeats.length === 0 && <p className="seat-map-empty" role="status">ยังไม่มีข้อมูลโซนที่นั่งสำหรับคอนเสิร์ตนี้</p>}
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

              const zoneAvailable = seats.filter((seatData) => !isSeatBooked(zoneId, seatData.seat, seatData.status)).length;

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

                    <div className="zone-availability" role="status">
                      {!canBook ? (
                        <strong>{eventEnded ? "EVENT ENDED" : "BOOKING UNAVAILABLE"}</strong>
                      ) : seats.length === 0 ? (
                        <span>ยังไม่เปิดให้จองในขณะนี้</span>
                      ) : zoneAvailable === 0 ? (
                        <><strong>SOLD OUT</strong><span>{seats.length} seats</span></>
                      ) : (
                        <><strong>{zoneAvailable}</strong><span>/ {seats.length} available</span></>
                      )}
                    </div>

                  </div>

                  {/* ================================
                      SEAT MAP ของ ZONE นี้
                  ================================= */}

                  {seats.length === 0 ? (
                    <p className="zone-seat-empty" role="status">ขออภัย ขณะนี้ยังไม่สามารถจองที่นั่งโซนนี้ได้</p>
                  ) : <div className="zone-seat-area">

                    <div
                      className="seat-map zone-seat-map"
                      style={{ gridTemplateColumns: `repeat(${Number(zone.seatsPerRow) > 0 ? Number(zone.seatsPerRow) : Math.min(seats.length, 12)}, 64px)` }}
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
                              seat,
                              seatData.status
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
                                isBooked || !canBook
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

                  </div>}

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
                !canBook || selectedSeats.length === 0
              }
            >
              Continue to Payment
            </button>

          </div>

        </div>

      </section>

    </div>
  );
}

export default ConcertDetail;
