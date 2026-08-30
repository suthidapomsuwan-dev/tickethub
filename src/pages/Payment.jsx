import React, { useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] =
    useState("promptpay");

  const [isPaid, setIsPaid] =
    useState(false);

  // รับข้อมูลจาก navigate state
  // ถ้า refresh ให้ดึงจาก localStorage
  const bookingData =
    location.state ||
    JSON.parse(
      localStorage.getItem(
        "ticketHubCurrentBooking"
      )
    );

  // =========================
  // NO BOOKING DATA
  // =========================

  if (!bookingData) {
    return (
      <div className="page empty-page">

        <h2>
          No booking information
        </h2>

        <button
          className="primary-button"
          onClick={() =>
            navigate("/")
          }
        >
          Back to Concerts
        </button>

      </div>
    );
  }

  const {
    concertId,
    concertName,
    artist,
    image,
    date,
    venue,
    zone,
    zoneId,
    price,
    seats,
    total
  } = bookingData;


  // =========================
  // PAYMENT
  // =========================

  const handlePayment = () => {

    if (isPaid) return;

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          "ticketHubUser"
        )
      ) || {};

    const bookingId =
      "TH" +
      Date.now()
        .toString()
        .slice(-8);

    const booking = {

      id: bookingId,

      username:
        currentUser.username ||
        "user",

      concertId,

      concertName,

      artist,

      image,

      date,

      venue,

      zone,

      zoneId,

      price,

      seats,

      total,

      paymentMethod:
        method,

      status: "Paid",

      createdAt:
        new Date().toLocaleString(
          "th-TH"
        )
    };


    // =========================
    // SAVE BOOKING
    // =========================

    const oldBookings =
      JSON.parse(
        localStorage.getItem(
          "ticketHubBookings"
        )
      ) || [];


    localStorage.setItem(
      "ticketHubBookings",
      JSON.stringify([
        ...oldBookings,
        booking
      ])
    );


    // บันทึก booking ล่าสุด
    localStorage.setItem(
      "ticketHubLastBooking",
      JSON.stringify(
        booking
      )
    );


    // ลบข้อมูล booking ชั่วคราว
    localStorage.removeItem(
      "ticketHubCurrentBooking"
    );


    setIsPaid(true);


    // ไปหน้า success
    setTimeout(() => {

      navigate(
        "/booking-success",
        {
          state: booking
        }
      );

    }, 800);
  };


  // =========================
  // PAGE
  // =========================

  return (
    <div className="payment-page">

      {/* =========================
          HEADER
      ========================= */}

      <div className="payment-header">

        <button
          className="back-button"
          onClick={() =>
            navigate(-1)
          }
        >
          ← Back
        </button>

        <h1>
          Payment
        </h1>

        <p>
          Complete your booking
        </p>

      </div>


      <div className="payment-layout">

        {/* =========================
            LEFT
        ========================= */}

        <div className="payment-main">

          <div className="payment-card">

            <h2>
              Payment Method
            </h2>


            {/* PROMPTPAY */}

            <label
              className={
                method === "promptpay"
                  ? "payment-method active"
                  : "payment-method"
              }
            >

              <input
                type="radio"
                name="payment"
                value="promptpay"
                checked={
                  method ===
                  "promptpay"
                }
                onChange={(e) =>
                  setMethod(
                    e.target.value
                  )
                }
              />

              <div>

                <strong>
                  PromptPay
                </strong>

                <span>
                  Pay with QR Code
                </span>

              </div>

            </label>


            {/* CARD */}

            <label
              className={
                method === "card"
                  ? "payment-method active"
                  : "payment-method"
              }
            >

              <input
                type="radio"
                name="payment"
                value="card"
                checked={
                  method === "card"
                }
                onChange={(e) =>
                  setMethod(
                    e.target.value
                  )
                }
              />

              <div>

                <strong>
                  Credit / Debit Card
                </strong>

                <span>
                  Visa / Mastercard
                </span>

              </div>

            </label>


            {/* PROMPTPAY QR */}

            {method ===
              "promptpay" && (

              <div className="qr-payment">

                <div className="qr-box">
                  QR
                </div>

                <p>
                  Scan this QR code
                  to complete payment
                </p>

              </div>

            )}


            {/* CARD FORM */}

            {method === "card" && (

              <div className="card-form">

                <label>
                  Card Number
                </label>

                <input
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                />

                <div className="card-row">

                  <div>

                    <label>
                      Expiry Date
                    </label>

                    <input
                      type="text"
                      placeholder="MM / YY"
                    />

                  </div>

                  <div>

                    <label>
                      CVV
                    </label>

                    <input
                      type="password"
                      placeholder="•••"
                      maxLength="3"
                    />

                  </div>

                </div>

              </div>

            )}

          </div>


          {/* =========================
              PAY BUTTON
          ========================= */}

          <button
            className="primary-button payment-button"
            onClick={handlePayment}
            disabled={isPaid}
          >

            {isPaid
              ? "Processing..."
              : `Pay ฿${Number(
                  total || 0
                ).toLocaleString()}`
            }

          </button>

        </div>


        {/* =========================
            ORDER SUMMARY
        ========================= */}

        <aside className="order-summary">

          <h2>
            Order Summary
          </h2>


          <div className="order-concert">

            {image ? (

              <img
                src={image}
                alt={concertName}
              />

            ) : (

              <div className="no-image">
                NO IMAGE
              </div>

            )}


            <div>

              <strong>
                {concertName}
              </strong>

              <span>
                {artist}
              </span>

            </div>

          </div>


          <div className="order-info">

            <div>
              <span>
                Date
              </span>

              <b>
                {date}
              </b>
            </div>


            <div>
              <span>
                Venue
              </span>

              <b>
                {venue}
              </b>
            </div>


            <div>
              <span>
                Zone
              </span>

              <b>
                {zone}
              </b>
            </div>


            <div>
              <span>
                Seats
              </span>

              <b>
                {Array.isArray(
                  seats
                )
                  ? seats.join(", ")
                  : "-"}
              </b>
            </div>


            <div>
              <span>
                Price / Seat
              </span>

              <b>
                ฿
                {Number(
                  price || 0
                ).toLocaleString()}
              </b>
            </div>

          </div>


          <div className="order-total">

            <span>
              Total
            </span>

            <strong>
              ฿
              {Number(
                total || 0
              ).toLocaleString()}
            </strong>

          </div>

        </aside>

      </div>

    </div>
  );
}

export default Payment;