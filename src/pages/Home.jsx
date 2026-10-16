import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";

const defaultConcerts = [
  {
    id: "C001",
    name: "Summer Music Festival",
    artist: "BUS",
    date: "2026-09-12",
    venue: "IMPACT Arena",
    price: 1800,
    description:
      "A summer night filled with music, energy and unforgettable moments with BUS.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
    zones: [
      {
        id: "VIP",
        name: "VIP",
        price: 2500,
        rows: 2,
        seatsPerRow: 8,
      },
      {
        id: "A",
        name: "Regular A",
        price: 1800,
        rows: 3,
        seatsPerRow: 10,
      },
    ],
  },

  {
    id: "C002",
    name: "The Next Concert",
    artist: "LYKN",
    date: "2026-10-20",
    venue: "Thunder Dome",
    price: 1800,
    description:
      "Experience an exciting night of live performances and special moments with LYKN.",
    image:
      "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14",
    zones: [
      {
        id: "A",
        name: "Regular A",
        price: 1800,
        rows: 3,
        seatsPerRow: 10,
      },
    ],
  },

  {
    id: "C003",
    name: "Live On Stage",
    artist: "PROXIE",
    date: "2026-11-05",
    venue: "Union Hall",
    price: 1200,
    description:
      "A live concert experience featuring powerful performances from PROXIE.",
    image:
      "https://images.unsplash.com/photo-1506157786151-b8491531f063",
    zones: [
      {
        id: "A",
        name: "Regular A",
        price: 1200,
        rows: 3,
        seatsPerRow: 10,
      },
    ],
  },
];

function Home({ user, onLogout }) {
  const [concerts, setConcerts] = useState([]);

  // =========================
  // CALENDAR
  // =========================

  const today = new Date();

  const [calendarMonth, setCalendarMonth] = useState(
    today.getMonth()
  );

  const [calendarYear, setCalendarYear] = useState(
    today.getFullYear()
  );

  const [selectedDate, setSelectedDate] = useState(null);

  // =========================
  // LOAD CONCERTS FROM FIREBASE
  // =========================

  useEffect(() => {
    const concertsRef = ref(db, "concerts");

    const unsubscribe = onValue(
      concertsRef,
      (snapshot) => {
        const data = snapshot.val();

        // ถ้า Firebase ยังไม่มีข้อมูล
        // ใช้ข้อมูล default
        if (!data) {
          setConcerts(defaultConcerts);
          return;
        }

        const firebaseConcerts = Object.values(data);

        const updatedConcerts = firebaseConcerts.map(
          (concert) => {
            const defaultConcert =
              defaultConcerts.find(
                (item) =>
                  String(item.id) ===
                  String(concert.id)
              );

            /*
             * สำคัญ:
             * ถ้า Firebase มี zones อยู่แล้ว
             * ให้ใช้ zones จาก Firebase
             *
             * ถ้าไม่มี zones
             * ให้ใช้ zones จาก default
             */
            const zones =
              Array.isArray(concert.zones) &&
              concert.zones.length > 0
                ? concert.zones
                : defaultConcert?.zones || [];

            /*
             * หาราคาต่ำสุดจาก Zone จริง
             * เพื่อให้ตรงกับราคาหน้าเลือกที่นั่ง
             */
            const zonePrices = zones
              .map((zone) => Number(zone.price))
              .filter(
                (price) =>
                  !isNaN(price) && price > 0
              );

            const startingPrice =
              zonePrices.length > 0
                ? Math.min(...zonePrices)
                : Number(
                    concert.price ??
                      defaultConcert?.price ??
                      0
                  );

            return {
              ...concert,

              description:
                concert.description ||
                defaultConcert?.description ||
                "Experience an unforgettable live concert with amazing performances and great music.",

              zones,

              // ราคาเริ่มต้นจะตรงกับ Zone ที่ถูกที่สุด
              price: startingPrice,
            };
          }
        );

        setConcerts(updatedConcerts);
      },
      (error) => {
        console.error(
          "Firebase concerts error:",
          error
        );

        // ถ้า Firebase มีปัญหา
        // ใช้ข้อมูล default
        setConcerts(defaultConcerts);
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================
  // CALENDAR DATA
  // =========================

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const weekdays = [
    "S",
    "M",
    "T",
    "W",
    "T",
    "F",
    "S",
  ];

  const firstDay = new Date(
    calendarYear,
    calendarMonth,
    1
  ).getDay();

  const daysInMonth = new Date(
    calendarYear,
    calendarMonth + 1,
    0
  ).getDate();

  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    calendarDays.push(day);
  }

  // =========================
  // DATE KEY
  // =========================

  const getDateKey = (day) => {
    const month = String(
      calendarMonth + 1
    ).padStart(2, "0");

    const date = String(day).padStart(
      2,
      "0"
    );

    return `${calendarYear}-${month}-${date}`;
  };

  // =========================
  // CHECK CONCERT DATE
  // =========================

  const hasConcert = (day) => {
    if (!day) return false;

    const dateKey = getDateKey(day);

    return concerts.some(
      (concert) =>
        String(concert.date).slice(0, 10) ===
        dateKey
    );
  };

  // =========================
  // SELECT DATE
  // =========================

  const handleDateClick = (day) => {
    if (!day) return;

    const dateKey = getDateKey(day);

    if (hasConcert(day)) {
      setSelectedDate(dateKey);
    } else {
      setSelectedDate(null);
    }
  };

  // =========================
  // CHANGE MONTH
  // =========================

  const changeMonth = (amount) => {
    let newMonth = calendarMonth + amount;
    let newYear = calendarYear;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setCalendarMonth(newMonth);
    setCalendarYear(newYear);
    setSelectedDate(null);
  };

  // =========================
  // SELECTED CONCERTS
  // =========================

  const selectedConcerts =
    selectedDate
      ? concerts.filter(
          (concert) =>
            String(concert.date).slice(
              0,
              10
            ) === selectedDate
        )
      : [];

  // =========================
  // GET STARTING PRICE
  // =========================

  const getStartingPrice = (concert) => {
    /*
     * ใช้ zones เป็นแหล่งข้อมูลหลัก
     * เพราะราคาหน้าเลือกที่นั่งมาจากตรงนี้
     */

    const zones = Array.isArray(
      concert.zones
    )
      ? concert.zones
      : [];

    const prices = zones
      .map((zone) => Number(zone.price))
      .filter(
        (price) =>
          !isNaN(price) && price > 0
      );

    if (prices.length > 0) {
      return Math.min(...prices);
    }

    // fallback กรณีไม่มี zones
    const concertPrice = Number(
      concert.price
    );

    if (
      !isNaN(concertPrice) &&
      concertPrice > 0
    ) {
      return concertPrice;
    }

    return 0;
  };

  // =========================
  // PAGE
  // =========================

  return (
    <div className="home-page">

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
            Hi, {user?.username || "User"}
          </span>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </nav>


      {/* =========================
          HERO
      ========================= */}

      <section className="concert-hero">

        <div>

          <p className="hero-label">
            TICKETHUB
          </p>

          <h1>
            Discover Your
            <br />
            Next Experience.
          </h1>

          <p>
            Find your favorite concerts,
            choose your seat and book your
            ticket.
          </p>

        </div>

      </section>


      {/* =========================
          CONCERT SECTION
      ========================= */}

      <section className="concert-section">

        {/* HEADER + CALENDAR */}

        <div className="section-top">

          <div className="section-heading">

            <div>

              <p className="section-label">
                EVENTS
              </p>

              <h2>
                Upcoming Concerts
              </h2>

            </div>

            <span>
              {concerts.length} concerts
            </span>

          </div>


          {/* =========================
              CALENDAR
          ========================= */}

          <div className="mini-calendar">

            <div className="mini-calendar-header">

              <button
                type="button"
                onClick={() =>
                  changeMonth(-1)
                }
              >
                ‹
              </button>

              <strong>
                {monthNames[calendarMonth]}{" "}
                {calendarYear}
              </strong>

              <button
                type="button"
                onClick={() =>
                  changeMonth(1)
                }
              >
                ›
              </button>

            </div>


            <div className="mini-calendar-weekdays">

              {weekdays.map(
                (day, index) => (
                  <span key={index}>
                    {day}
                  </span>
                )
              )}

            </div>


            <div className="mini-calendar-grid">

              {calendarDays.map(
                (day, index) => {

                  if (!day) {
                    return (
                      <span
                        key={`empty-${index}`}
                        className="calendar-empty"
                      />
                    );
                  }

                  const dateKey =
                    getDateKey(day);

                  const concertDay =
                    hasConcert(day);

                  const selected =
                    selectedDate ===
                    dateKey;

                  return (
                    <button
                      type="button"
                      key={dateKey}
                      className={
                        selected
                          ? "mini-calendar-day selected"
                          : concertDay
                          ? "mini-calendar-day concert-day"
                          : "mini-calendar-day"
                      }
                      onClick={() =>
                        handleDateClick(day)
                      }
                      title={
                        concertDay
                          ? "Concert available"
                          : ""
                      }
                    >

                      {day}

                      {concertDay && (
                        <i></i>
                      )}

                    </button>
                  );
                }
              )}

            </div>


            <div className="calendar-hint">

              <i></i>

              Concert date

            </div>

          </div>

        </div>


        {/* =========================
            SELECTED DATE
        ========================= */}

        {selectedDate && (

          <div className="selected-date-panel">

            <div>

              <p>
                CONCERTS ON
              </p>

              <strong>
                {new Date(
                  `${selectedDate}T00:00:00`
                ).toLocaleDateString(
                  "en-US",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </strong>

            </div>

            <button
              type="button"
              onClick={() =>
                setSelectedDate(null)
              }
            >
              ×
            </button>

          </div>

        )}


        {/* =========================
            SELECTED DATE RESULTS
        ========================= */}

        {selectedDate &&
          selectedConcerts.length > 0 && (

            <div className="selected-concert-list">

              {selectedConcerts.map(
                (concert) => (

                  <div
                    className="selected-concert-item"
                    key={concert.id}
                  >

                    <div>

                      <strong>
                        {concert.name}
                      </strong>

                      <span>
                        {concert.artist}
                      </span>

                      <small>
                        📍 {concert.venue}
                      </small>

                    </div>

                    <Link
                      to={`/concert/${concert.id}`}
                      className="calendar-view-button"
                    >
                      View
                    </Link>

                  </div>

                )
              )}

            </div>

          )}


        {/* =========================
            CONCERT CARDS
        ========================= */}

        <div className="concert-grid">

          {concerts.map(
            (concert) => {

              /*
               * ราคาที่แสดงบนหน้าแนะนำ
               * จะมาจาก Zone จริง
               */
              const price =
                getStartingPrice(
                  concert
                );

              return (

                <div
                  className="concert-card"
                  key={concert.id}
                >

                  {/* IMAGE */}

                  <div className="concert-image">

                    {concert.image ? (

                      <img
                        src={concert.image}
                        alt={concert.name}
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


                  {/* INFO */}

                  <div className="concert-info">

                    <p className="concert-date">
                      {concert.date}
                    </p>

                    <h3>
                      {concert.name}
                    </h3>

                    <p className="artist">
                      {concert.artist}
                    </p>


                    <p className="concert-description">
                      {concert.description ||
                        "Experience an unforgettable live concert with amazing performances and great music."}
                    </p>


                    <p className="venue">
                      📍 {concert.venue}
                    </p>


                    {/* BOTTOM */}

                    <div className="concert-bottom">

                      <div>

                        <small>
                          Starting from
                        </small>

                        <strong>
                          ฿
                          {Number(
                            price
                          ).toLocaleString()}
                        </strong>

                      </div>

                      <Link
                        to={`/concert/${concert.id}`}
                        className="view-button"
                      >
                        View
                      </Link>

                    </div>

                  </div>

                </div>

              );
            }
          )}

        </div>

      </section>

    </div>
  );
}

export default Home;