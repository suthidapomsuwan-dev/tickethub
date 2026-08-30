import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "../firebase";

const defaultConcerts = [
  {
    id: "C001",
    name: "Summer Music Festival",
    artist: "BUS",
    date: "2026-09-12",
    venue: "IMPACT Arena",
    price: 1500,
    description:
      "A summer night filled with music, energy and unforgettable moments with BUS.",
    image:
      "https://images.unsplash.com/photo-1501386761578-eac5c94b800a",
    zones: [
      {
        id: "VIP",
        name: "VIP",
        price: 2500
      },
      {
        id: "A",
        name: "Regular A",
        price: 1800
      }
    ]
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
        price: 1800
      }
    ]
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
        price: 1200
      }
    ]
  }
];

function AdminDashboard({ user, onLogout }) {

  const [activePage, setActivePage] =
    useState("concerts");

  const [concerts, setConcerts] =
    useState(defaultConcerts);

  const [bookings, setBookings] =
    useState([]);

  const [reports, setReports] =
    useState([]);

  const [showModal, setShowModal] =
    useState(false);

  const [editingConcert, setEditingConcert] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const csvInputRef =
    useRef(null);


  // =========================
  // LOAD CONCERTS FROM FIREBASE
  // =========================

  useEffect(() => {

    const concertsRef =
      ref(db, "concerts");

    const unsubscribe =
      onValue(
        concertsRef,
        (snapshot) => {

          const data =
            snapshot.val();

          if (!data) {

            setConcerts(
              defaultConcerts
            );

            return;
          }

          const firebaseConcerts =
            Object.values(data);

          const updatedConcerts =
            firebaseConcerts.map(
              (concert) => {

                const defaultConcert =
                  defaultConcerts.find(
                    (item) =>
                      String(item.id) ===
                      String(concert.id)
                  );

                return {
                  ...concert,

                  description:
                    concert.description ||
                    defaultConcert?.description ||
                    "Experience an unforgettable live concert with amazing performances and great music.",

                  zones:
                    concert.zones ||
                    defaultConcert?.zones ||
                    []
                };
              }
            );

          setConcerts(
            updatedConcerts
          );
        },
        (error) => {

          console.error(
            "Firebase concerts error:",
            error
          );

          setConcerts(
            defaultConcerts
          );
        }
      );

    return () =>
      unsubscribe();

  }, []);


  // =========================
  // LOAD BOOKINGS
  // =========================

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "ticketHubBookings"
      );

    if (saved) {

      try {

        setBookings(
          JSON.parse(saved)
        );

      } catch {

        setBookings([]);

      }

    }

  }, []);


  // =========================
  // LOAD REPORTS
  // =========================

  useEffect(() => {

    const saved =
      localStorage.getItem(
        "ticketHubReports"
      );

    if (saved) {

      try {

        setReports(
          JSON.parse(saved)
        );

      } catch {

        setReports([]);

      }

    }

  }, []);


  // =========================
  // ADD CONCERT
  // =========================

  const openAdd = () => {

    setEditingConcert({

      id:
        `C${String(
          Date.now()
        ).slice(-5)}`,

      name: "",

      artist: "",

      date: "",

      venue: "",

      price: 1000,

      description: "",

      image: "",

      zones: [
        {
          id: "A",
          name: "Regular A",
          price: 1000
        }
      ]

    });

    setShowModal(true);
  };


  // =========================
  // EDIT CONCERT
  // =========================

  const openEdit = (concert) => {

    setEditingConcert({

      ...concert,

      zones:
        concert.zones || []

    });

    setShowModal(true);
  };


  // =========================
  // DELETE CONCERT
  // =========================

  const deleteConcert = async (id) => {

    const confirmDelete =
      window.confirm(
        "ต้องการลบคอนเสิร์ตนี้หรือไม่?"
      );

    if (!confirmDelete)
      return;

    try {

      await remove(
        ref(
          db,
          `concerts/${id}`
        )
      );

    } catch (error) {

      console.error(
        "Delete concert error:",
        error
      );

      alert(
        "ไม่สามารถลบคอนเสิร์ตได้"
      );

    }

  };


  // =========================
  // IMAGE UPLOAD
  // =========================

  const handleImageUpload = (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file)
      return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {

      alert(
        "กรุณาเลือกไฟล์รูปภาพ"
      );

      return;
    }

    if (
      file.size >
      5 * 1024 * 1024
    ) {

      alert(
        "รูปภาพต้องมีขนาดไม่เกิน 5MB"
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      setEditingConcert(
        (current) => ({
          ...current,
          image:
            reader.result
        })
      );

    };

    reader.readAsDataURL(
      file
    );

    event.target.value =
      "";

  };


  // =========================
  // SAVE CONCERT
  // =========================

  const saveConcert = async () => {

    if (
      !editingConcert.name?.trim() ||
      !editingConcert.artist?.trim() ||
      !editingConcert.date ||
      !editingConcert.venue?.trim()
    ) {

      alert(
        "กรุณากรอกข้อมูลให้ครบ"
      );

      return;
    }

    const concertToSave = {

      ...editingConcert,

      price:
        Number(
          editingConcert.price
        ) || 0,

      zones:
        (editingConcert.zones || [])
          .map((zone) => ({
            ...zone,
            price:
              Number(
                zone.price
              ) || 0
          }))

    };

    try {

      await set(
        ref(
          db,
          `concerts/${concertToSave.id}`
        ),
        concertToSave
      );

      setShowModal(false);

      setEditingConcert(null);

    } catch (error) {

      console.error(
        "Save concert error:",
        error
      );

      alert(
        "ไม่สามารถบันทึกคอนเสิร์ตได้"
      );

    }

  };


  // =========================
  // ADD ZONE
  // =========================

  const addZone = () => {

    const newZone = {

      id:
        `ZONE${Date.now()}`,

      name:
        "New Zone",

      price:
        1000

    };

    setEditingConcert(
      (current) => ({

        ...current,

        zones: [
          ...(current.zones || []),
          newZone
        ]

      })
    );

  };


  // =========================
  // UPDATE ZONE
  // =========================

  const updateZone = (
    index,
    field,
    value
  ) => {

    setEditingConcert(
      (current) => {

        const updatedZones = [
          ...(current.zones || [])
        ];

        updatedZones[index] = {

          ...updatedZones[index],

          [field]:
            field === "price"
              ? Number(value)
              : value

        };

        return {

          ...current,

          zones:
            updatedZones

        };

      }
    );

  };


  // =========================
  // DELETE ZONE
  // =========================

  const deleteZone = (
    index
  ) => {

    setEditingConcert(
      (current) => ({

        ...current,

        zones:
          (current.zones || [])
            .filter(
              (_, i) =>
                i !== index
            )

      })
    );

  };


  // =========================
  // CSV IMPORT
  // =========================

  const importCSV = (
    event
  ) => {

    const file =
      event.target.files?.[0];

    if (!file)
      return;

    if (
      !file.name
        .toLowerCase()
        .endsWith(".csv")
    ) {

      alert(
        "กรุณาเลือกไฟล์ CSV"
      );

      return;
    }

    const reader =
      new FileReader();

    reader.onload = async (e) => {

      const text =
        e.target.result;

      const lines =
        text
          .split(/\r?\n/)
          .filter(
            (line) =>
              line.trim()
          );

      if (lines.length < 2) {

        alert(
          "CSV ไม่มีข้อมูล"
        );

        return;
      }

      const headers =
        lines[0]
          .split(",")
          .map(
            (item) =>
              item
                .trim()
                .replace(
                  /^"|"$/g,
                  ""
                )
          );

      const imported =
        lines
          .slice(1)
          .map(
            (line, index) => {

              const values =
                line
                  .split(",")
                  .map(
                    (item) =>
                      item
                        .trim()
                        .replace(
                          /^"|"$/g,
                          ""
                        )
                  );

              const data =
                {};

              headers.forEach(
                (
                  header,
                  i
                ) => {

                  data[header] =
                    values[i] ||
                    "";

                }
              );

              return {

                id:
                  data.id ||
                  `CSV${Date.now()}${index}`,

                name:
                  data.name ||
                  "Untitled Concert",

                artist:
                  data.artist ||
                  "",

                date:
                  data.date ||
                  "",

                venue:
                  data.venue ||
                  "",

                price:
                  Number(
                    data.price
                  ) || 1000,

                description:
                  data.description ||
                  "",

                image:
                  data.image ||
                  "",

                zones: [
                  {

                    id: "A",

                    name:
                      data.zone ||
                      "Regular A",

                    price:
                      Number(
                        data.price
                      ) || 1000

                  }

                ]

              };

            }
          );

      try {

        for (
          const concert
          of imported
        ) {

          await set(
            ref(
              db,
              `concerts/${concert.id}`
            ),
            concert
          );

        }

        alert(
          `นำเข้า ${imported.length} รายการสำเร็จ`
        );

      } catch (error) {

        console.error(
          "CSV import error:",
          error
        );

        alert(
          "ไม่สามารถนำเข้า CSV ได้"
        );

      }

    };

    reader.readAsText(
      file
    );

    event.target.value =
      "";

  };


  // =========================
  // FILTER
  // =========================

  const filteredConcerts =
    concerts.filter(
      (concert) => {

        const keyword =
          search.toLowerCase();

        return (

          concert.name
            ?.toLowerCase()
            .includes(keyword)

          ||

          concert.artist
            ?.toLowerCase()
            .includes(keyword)

        );

      }
    );


  return (

    <div className="admin-layout">

      {/* =========================
          SIDEBAR
      ========================= */}

      <aside className="admin-sidebar">

        <Link
          to="/admin"
          className="admin-logo"
        >
          Ticket<span>Hub</span>
        </Link>

        <p className="admin-label">
          ADMIN PANEL
        </p>


        <button
          className={
            activePage === "concerts"
              ? "admin-menu active"
              : "admin-menu"
          }
          onClick={() =>
            setActivePage(
              "concerts"
            )
          }
        >
          🎤 Concerts
        </button>


        <button
          className={
            activePage === "bookings"
              ? "admin-menu active"
              : "admin-menu"
          }
          onClick={() =>
            setActivePage(
              "bookings"
            )
          }
        >
          🎫 Bookings
        </button>


        <button
          className={
            activePage === "reports"
              ? "admin-menu active"
              : "admin-menu"
          }
          onClick={() =>
            setActivePage(
              "reports"
            )
          }
        >
          ⚠️ Reports
        </button>


        <div className="admin-sidebar-bottom">

          <Link
            to="/"
            className="admin-menu"
          >
            ← Back to Website
          </Link>


          <button
            type="button"
            className="admin-menu logout-admin"
            onClick={onLogout}
          >
            ⇥ Logout
          </button>

        </div>

      </aside>


      {/* =========================
          MAIN
      ========================= */}

      <main className="admin-main">

        <header className="admin-header">

          <div>

            <p className="section-label">
              TICKETHUB
            </p>

            <h1>

              {activePage ===
              "concerts"

                ? "Concert Management"

                : activePage ===
                  "bookings"

                ? "Booking Management"

                : "Problem Reports"}

            </h1>

          </div>


          <div className="admin-user">

            {user?.username ||
              "ADMIN"}

          </div>

        </header>


        {/* =========================
            CONCERTS
        ========================= */}

        {activePage ===
          "concerts" && (

          <section>

            <div className="admin-toolbar">

              <input
                type="text"
                placeholder="Search concerts..."
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
              />


              <div className="toolbar-buttons">

                <button
                  className="secondary-button"
                  onClick={() =>
                    csvInputRef.current?.click()
                  }
                >
                  📄 Import CSV
                </button>


                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  hidden
                  onChange={
                    importCSV
                  }
                />


                <button
                  className="primary-button"
                  onClick={openAdd}
                >
                  + Add Concert
                </button>

              </div>

            </div>


            {/* STATS */}

            <div className="admin-stats">

              <div className="admin-stat-card">

                <span>
                  Concerts
                </span>

                <strong>
                  {concerts.length}
                </strong>

              </div>


              <div className="admin-stat-card">

                <span>
                  Bookings
                </span>

                <strong>
                  {bookings.length}
                </strong>

              </div>


              <div className="admin-stat-card">

                <span>
                  Reports
                </span>

                <strong>
                  {reports.length}
                </strong>

              </div>

            </div>


            {/* CONCERT LIST */}

            <div className="admin-concert-list">

              {filteredConcerts.length ===
              0 ? (

                <div className="table-empty">
                  No concerts found
                </div>

              ) : (

                filteredConcerts.map(
                  (concert) => (

                    <div
                      className="admin-concert-card"
                      key={concert.id}
                    >

                      <div className="admin-concert-image">

                        {concert.image ? (

                          <img
                            src={
                              concert.image
                            }
                            alt={
                              concert.name
                            }
                          />

                        ) : (

                          <div className="no-image">
                            NO IMAGE
                          </div>

                        )}

                      </div>


                      <div className="admin-concert-info">

                        <div>

                          <span className="concert-id">
                            {concert.id}
                          </span>

                          <h2>
                            {concert.name}
                          </h2>

                          <p>
                            {concert.artist}
                          </p>

                        </div>


                        <div className="admin-concert-meta">

                          <span>
                            📅{" "}
                            {concert.date}
                          </span>

                          <span>
                            📍{" "}
                            {concert.venue}
                          </span>

                          <span>
                            🪑{" "}
                            {concert.zones
                              ?.length ||
                              0}{" "}
                            zones
                          </span>

                        </div>


                        <div className="admin-actions">

                          <button
                            className="secondary-button"
                            onClick={() =>
                              openEdit(
                                concert
                              )
                            }
                          >
                            Edit
                          </button>


                          <button
                            className="danger-button"
                            onClick={() =>
                              deleteConcert(
                                concert.id
                              )
                            }
                          >
                            Delete
                          </button>

                        </div>

                      </div>

                    </div>

                  )
                )

              )}

            </div>

          </section>

        )}


        {/* =========================
            BOOKINGS
        ========================= */}

        {activePage ===
          "bookings" && (

          <section className="admin-table-section">

            <div className="admin-table">

              <div className="table-header">

                <span>
                  Booking ID
                </span>

                <span>
                  User
                </span>

                <span>
                  Concert
                </span>

                <span>
                  Zone
                </span>

                <span>
                  Seats
                </span>

                <span>
                  Total
                </span>

                <span>
                  Status
                </span>

              </div>


              {bookings.length ===
              0 ? (

                <div className="table-empty">
                  No bookings yet
                </div>

              ) : (

                bookings
                  .slice()
                  .reverse()
                  .map(
                    (booking) => (

                      <div
                        className="table-row"
                        key={
                          booking.id
                        }
                      >

                        <span>
                          {booking.id}
                        </span>

                        <span>
                          {booking.username}
                        </span>

                        <span>
                          {booking.concertName}
                        </span>

                        <span>
                          {booking.zone}
                        </span>

                        <span>
                          {Array.isArray(
                            booking.seats
                          )
                            ? booking.seats.join(
                                ", "
                              )
                            : "-"}
                        </span>

                        <span>
                          ฿
                          {Number(
                            booking.total ||
                              0
                          ).toLocaleString()}
                        </span>

                        <span className="status-paid">
                          {booking.status ||
                            "Paid"}
                        </span>

                      </div>

                    )
                  )

              )}

            </div>

          </section>

        )}


        {/* =========================
            REPORTS
        ========================= */}

        {activePage ===
          "reports" && (

          <section className="admin-table-section">

            <div className="admin-table">

              <div className="table-header report-grid">

                <span>
                  ID
                </span>

                <span>
                  User
                </span>

                <span>
                  Subject
                </span>

                <span>
                  Message
                </span>

                <span>
                  Status
                </span>

              </div>


              {reports.length ===
              0 ? (

                <div className="table-empty">
                  No reports yet
                </div>

              ) : (

                reports
                  .slice()
                  .reverse()
                  .map(
                    (report) => (

                      <div
                        className="table-row report-grid"
                        key={
                          report.id
                        }
                      >

                        <span>
                          {report.id}
                        </span>

                        <span>
                          {report.username}
                        </span>

                        <span>
                          {report.subject}
                        </span>

                        <span>
                          {report.message}
                        </span>

                        <span className="status-pending">
                          {report.status ||
                            "Pending"}
                        </span>

                      </div>

                    )
                  )

              )}

            </div>

          </section>

        )}

      </main>


      {/* =========================
          MODAL
      ========================= */}

      {showModal &&
        editingConcert && (

          <div className="modal-backdrop">

            <div className="concert-modal">

              {/* MODAL HEADER */}

              <div className="modal-header">

                <div>

                  <p className="section-label">
                    CONCERT
                  </p>

                  <h2>

                    {concerts.some(
                      (c) =>
                        c.id ===
                        editingConcert.id
                    )
                      ? "Edit Concert"
                      : "Add Concert"}

                  </h2>

                </div>


                <button
                  type="button"
                  className="close-button"
                  onClick={() => {

                    setShowModal(
                      false
                    );

                    setEditingConcert(
                      null
                    );

                  }}
                >
                  ×
                </button>

              </div>


              {/* FORM */}

              <div className="form-grid">

                <div className="form-group">

                  <label>
                    Concert ID
                  </label>

                  <input
                    value={
                      editingConcert.id
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          id: e.target.value
                        }
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Concert Name
                  </label>

                  <input
                    value={
                      editingConcert.name
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          name: e.target.value
                        }
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Artist
                  </label>

                  <input
                    value={
                      editingConcert.artist
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          artist:
                            e.target.value
                        }
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Date
                  </label>

                  <input
                    type="date"
                    value={
                      editingConcert.date
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          date:
                            e.target.value
                        }
                      )
                    }
                  />

                </div>


                <div className="form-group full">

                  <label>
                    Venue
                  </label>

                  <input
                    value={
                      editingConcert.venue
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          venue:
                            e.target.value
                        }
                      )
                    }
                  />

                </div>


                {/* DESCRIPTION */}

                <div className="form-group full">

                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      editingConcert.description ||
                      ""
                    }
                    onChange={(e) =>
                      setEditingConcert(
                        {
                          ...editingConcert,
                          description:
                            e.target.value
                        }
                      )
                    }
                    rows="4"
                    placeholder="Concert description..."
                  />

                </div>


                {/* IMAGE */}

                <div className="form-group full">

                  <label>
                    Concert Image
                  </label>

                  <div className="image-upload-box">

                    {editingConcert.image ? (

                      <img
                        src={
                          editingConcert.image
                        }
                        alt="Preview"
                      />

                    ) : (

                      <div className="image-placeholder">
                        No image selected
                      </div>

                    )}


                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() =>
                        document
                          .getElementById(
                            "concertImageInput"
                          )
                          ?.click()
                      }
                    >
                      Choose Image
                    </button>


                    <input
                      id="concertImageInput"
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={
                        handleImageUpload
                      }
                    />

                  </div>

                </div>

              </div>


              {/* =========================
                  ZONES
              ========================= */}

              <div className="zone-management">

                <div className="zone-heading">

                  <div>

                    <p className="section-label">
                      SEATING
                    </p>

                    <h3>
                      Zones
                    </h3>

                  </div>


                  <button
                    type="button"
                    className="secondary-button"
                    onClick={
                      addZone
                    }
                  >
                    + Add Zone
                  </button>

                </div>


                {(editingConcert.zones ||
                  []).map(
                  (
                    zone,
                    index
                  ) => (

                    <div
                      className="zone-edit-card"
                      key={
                        zone.id
                      }
                    >

                      <div className="zone-edit-title">

                        Zone{" "}
                        {index + 1}

                      </div>


                      <div className="zone-edit-grid">

                        {/* ZONE NAME */}

                        <div>

                          <label>
                            Zone Name
                          </label>

                          <input
                            value={
                              zone.name
                            }
                            onChange={(
                              e
                            ) =>
                              updateZone(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                            placeholder="เช่น VIP, Regular A"
                          />

                        </div>


                        {/* PRICE */}

                        <div>

                          <label>
                            Price
                          </label>

                          <input
                            type="number"
                            min="0"
                            value={
                              zone.price
                            }
                            onChange={(
                              e
                            ) =>
                              updateZone(
                                index,
                                "price",
                                e.target.value
                              )
                            }
                            placeholder="Price per seat"
                          />

                        </div>

                      </div>


                      {/* REMOVE */}

                      <button
                        type="button"
                        className="danger-button small"
                        onClick={() =>
                          deleteZone(
                            index
                          )
                        }
                      >
                        Remove Zone
                      </button>

                    </div>

                  )
                )}

              </div>


              {/* FOOTER */}

              <div className="modal-footer">

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {

                    setShowModal(
                      false
                    );

                    setEditingConcert(
                      null
                    );

                  }}
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="primary-button"
                  onClick={
                    saveConcert
                  }
                >
                  Save Concert
                </button>

              </div>

            </div>

          </div>

        )}

    </div>
  );
}

export default AdminDashboard;