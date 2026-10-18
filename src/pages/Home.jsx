import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ref, onValue } from "firebase/database";
import { db } from "../firebase";
import { formatConcertDate, getConcertDateKey, getLocalDateKey, isConcertPast } from "../utils/concertDate";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [concertView, setConcertView] = useState("upcoming");

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
        getConcertDateKey(concert.date) === dateKey
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
            getConcertDateKey(concert.date) === selectedDate
        )
      : [];

  const todayKey = getLocalDateKey();
  const concertDateKey = (concert) => getConcertDateKey(concert.date);

  const upcomingConcerts = concerts
    .filter((concert) => concertDateKey(concert) && concertDateKey(concert) >= todayKey)
    .sort((a, b) => concertDateKey(a).localeCompare(concertDateKey(b)));

  const completedConcerts = concerts
    .filter((concert) => isConcertPast(concert.date))
    .sort((a, b) => concertDateKey(b).localeCompare(concertDateKey(a)));


  const concertsForView = concertView === "completed"
    ? completedConcerts
    : concertView === "upcoming"
      ? upcomingConcerts
      : concerts;

  const visibleConcerts = concertsForView
    .filter((concert) => {
      const query = searchTerm.trim().toLowerCase();
      return !query || `${concert.name || ""} ${concert.artist || ""}`.toLowerCase().includes(query);
    });

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

        <div className="hero-abstract-art" aria-hidden="true">
          <span className="hero-orbit hero-orbit--outer" />
          <span className="hero-orbit hero-orbit--inner" />
          <span className="hero-grid-mark" />
          <span className="hero-art-label">LIVE / 01</span>
        </div>

        <div>

          <p className="hero-label">
            LIVE EVENTS · TICKETHUB
          </p>

          <h1>
            LIVE WITHOUT LIMITS.
          </h1>

          <p>
            YOUR NEXT LIVE EXPERIENCE STARTS HERE.
          </p>

          <Link to="#upcoming-shows" className="hero-cta">
            EXPLORE EVENTS
          </Link>

        </div>

      </section>

      <div className="brand-marquee" aria-label="Music, live, experience, your next show">
        <div className="brand-marquee-track" aria-hidden="true">
          <span>MUSIC · LIVE · EXPERIENCE · YOUR NEXT SHOW ·</span>
          <span>MUSIC · LIVE · EXPERIENCE · YOUR NEXT SHOW ·</span>
        </div>
      </div>


      {/* =========================
          CONCERT SECTION
      ========================= */}

      <section className="concert-section" id="upcoming-shows">

        <div className="concert-discovery-bar">
          <label className="concert-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search concerts or artists"
              aria-label="Search concerts or artists"
            />
          </label>
          <div className="concert-view-tabs" role="tablist" aria-label="Concert dates">
            <button
              type="button"
              role="tab"
              aria-selected={concertView === "all"}
              className={concertView === "all" ? "active" : ""}
              onClick={() => setConcertView("all")}
            >
              All events <span>{concerts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={concertView === "upcoming"}
              className={concertView === "upcoming" ? "active" : ""}
              onClick={() => setConcertView("upcoming")}
            >
              Upcoming <span>{upcomingConcerts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={concertView === "completed"}
              className={concertView === "completed" ? "active" : ""}
              onClick={() => setConcertView("completed")}
            >
              Past events <span>{completedConcerts.length}</span>
            </button>
          </div>
        </div>

        {/* HEADER + CALENDAR */}

        <div className="section-top">

          <div className="section-heading">

            <div>

              <p className="section-label">
                EVENTS
              </p>

              <h2>
                {concertView === "completed" ? "PAST SHOWS" : concertView === "all" ? "ALL SHOWS" : "UPCOMING SHOWS"}
              </h2>

            </div>

            <span>
              {visibleConcerts.length} concerts
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
                        {concert.venue}
                      </small>
                      {isConcertPast(concert.date) && <small className="concert-ended-badge">EVENT ENDED</small>}

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

        {selectedDate && selectedConcerts.length === 0 && (
          <div className="calendar-day-empty">
            No concerts are listed for this date.
          </div>
        )}


        {/* =========================
            CONCERT CARDS
        ========================= */}

        {visibleConcerts.length > 0 ? (
        <div className="concert-grid">

          {visibleConcerts.map(
            (concert) => {

              /*
               * ราคาที่แสดงบนหน้าแนะนำ
               * จะมาจาก Zone จริง
               */
              const price =
                getStartingPrice(
                  concert
                );
              const ended = isConcertPast(concert.date);

              return (

                <div
                  className={`concert-card${ended ? " concert-card--ended" : ""}`}
                  key={concert.id}
                >

                  {/* IMAGE */}

                  <div className="concert-image">

                    <div className="concert-image-placeholder" aria-hidden="true">TICKETHUB / LIVE</div>

                    {concert.image ? (

                      <img
                        src={concert.image}
                        alt={concert.name}
                        onError={(e) => {
                          e.currentTarget.hidden = true;
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
                      {formatConcertDate(concert.date)}
                    </p>

                    {ended && <span className="concert-ended-badge">EVENT ENDED</span>}

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
                      {concert.venue}
                    </p>


                    {/* BOTTOM */}

                    <div className="concert-bottom">

                      <div>

                        {ended ? (
                          <small>Ticket sales closed</small>
                        ) : (
                          <>
                            <small>Starting from</small>
                            <strong>฿{Number(price).toLocaleString()}</strong>
                          </>
                        )}

                      </div>

                      <Link
                        to={`/concert/${concert.id}`}
                        className="view-button"
                      >
                        {ended ? "View details" : "View"}
                      </Link>

                    </div>

                  </div>

                </div>

              );
            }
          )}

        </div>
        ) : (
          <div className="concert-empty-state">
            <h3>{searchTerm ? "No concerts match your search" : concertView === "completed" ? "No past concerts yet" : "No upcoming concerts"}</h3>
            <p>{searchTerm ? "Try another concert name or artist." : "Concert listings will appear here when available."}</p>
          </div>
        )}

      </section>

    </div>
  );
}

export default Home;
