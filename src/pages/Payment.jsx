import React, { useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  ref,
  push,
  set
} from "firebase/database";

import { db } from "../firebase";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] =
    useState("promptpay");

  const [isPaid, setIsPaid] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  // =========================
  // GET BOOKING DATA
  // =========================

  let bookingData = location.state;

  if (!bookingData) {
    try {
      bookingData = JSON.parse(
        localStorage.getItem(
          "ticketHubCurrentBooking"
        )
      );
    } catch {
      bookingData = null;
    }
  }

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
          type="button"
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

  const handlePayment = async () => {

    if (isPaid || isProcessing) {
      return;
    }

    if (
      !Array.isArray(seats) ||
      seats.length === 0
    ) {
      alert(
        "ไม่พบข้อมูลที่นั่ง"
      );

      return;
    }

    setIsProcessing(true);

    try {

      // =========================
      // CURRENT USER
      // =========================

      let currentUser = {};

      try {
        currentUser =
          JSON.parse(
            localStorage.getItem(
              "ticketHubUser"
            )
          ) || {};
      } catch {
        currentUser = {};
      }

      // =========================
      // CREATE BOOKING ID
      // =========================

      const bookingId =
        "TH" +
        Date.now()
          .toString()
          .slice(-8);

      // =========================
      // BOOKING OBJECT
      // =========================

      const booking = {

        id: bookingId,

        username:
          currentUser.username ||
          "user",

        concertId:
          concertId || "",

        concertName:
          concertName || "",

        artist:
          artist || "",

        image:
          image || "",

        date:
          date || "",

        venue:
          venue || "",

        zone:
          zone || "",

        zoneId:
          zoneId || "",

        price:
          Number(price || 0),

        seats:
          seats,

        total:
          Number(total || 0),

        paymentMethod:
          method,

        status:
          "Paid",

        createdAt:
          new Date().toISOString()
      };

      // =========================
      // SAVE TO FIREBASE
      // =========================

      const bookingsRef =
        ref(db, "bookings");

      const newBookingRef =
        push(bookingsRef);

      await set(
        newBookingRef,
        booking
      );

      // =========================
      // ALSO SAVE LOCAL STORAGE
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

      // =========================
      // LAST BOOKING
      // =========================

      localStorage.setItem(
        "ticketHubLastBooking",
        JSON.stringify(booking)
      );

      // =========================
      // REMOVE TEMP BOOKING
      // =========================

      localStorage.removeItem(
        "ticketHubCurrentBooking"
      );

      // =========================
      // PAYMENT SUCCESS
      // =========================

      setIsPaid(true);

      setTimeout(() => {

        navigate(
          "/booking-success",
          {
            state: booking
          }
        );

      }, 800);

    } catch (error) {

      console.error(
        "Firebase booking error:",
        error
      );

      alert(
        "ไม่สามารถบันทึกการจองได้ กรุณาตรวจสอบ Firebase Realtime Database"
      );

      setIsProcessing(false);
    }
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
          type="button"
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
                      maxLength="7"
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
            type="button"
            className="primary-button payment-button"
            onClick={handlePayment}
            disabled={
              isPaid ||
              isProcessing
            }
          >

            {isPaid
              ? "Payment Successful"
              : isProcessing
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
                {Array.isArray(seats)
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