import { useEffect, useRef, useState } from "react";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

import {
  ref,
  push,
  get,
  set
} from "firebase/database";

import { db } from "../firebase";
import { canBookConcert, isConcertPast } from "../utils/concertDate";
import { validateDemoCardDetails } from "../utils/demoCardValidation";

function Payment() {
  const location = useLocation();
  const navigate = useNavigate();

  const [method, setMethod] =
    useState("promptpay");

  const [isPaid, setIsPaid] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [eventStatus, setEventStatus] = useState("checking");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const paymentLock = useRef(false);

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

  const bookingConcertId = bookingData?.concertId;
  const bookingDate = bookingData?.date;

  useEffect(() => {
    let active = true;

    if (!bookingConcertId) {
      return () => { active = false; };
    }

    get(ref(db, `concerts/${bookingConcertId}`))
      .then((snapshot) => {
        if (!active) return;
        const currentEvent = snapshot.val();
        if (!currentEvent) {
          setEventStatus("unavailable");
          return;
        }
        setEventStatus(canBookConcert(currentEvent.date) ? "available" : "ended");
      })
      .catch((error) => {
        console.error("Unable to verify concert date:", error);
        if (active) setEventStatus("unavailable");
      });

    return () => { active = false; };
  }, [bookingConcertId]);

  const verifyConcertBeforePayment = async () => {
    const snapshot = await get(ref(db, `concerts/${bookingConcertId}`));
    const currentEvent = snapshot.val();
    return currentEvent ? canBookConcert(currentEvent.date) : false;
  };

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

  if (eventStatus !== "available") {
    const statusMessage = eventStatus === "checking"
      ? "Checking event availability..."
      : eventStatus === "ended" || isConcertPast(bookingDate)
        ? "EVENT ENDED — ticket booking is closed."
        : "Event date could not be verified. Booking is unavailable.";

    return (
      <div className="page empty-page payment-event-unavailable" role="status">
        <h2>{statusMessage}</h2>
        <button type="button" className="primary-button" onClick={() => navigate("/")}>Back to Concerts</button>
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
    zoneName,
    zoneId,
    price,
    seats,
    total
  } = bookingData;

  // =========================
  // PAYMENT
  // =========================

  const handlePayment = async () => {

    if (isPaid || isProcessing || paymentLock.current) {
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

    if (method === "card") {
      const validationError = validateDemoCardDetails(cardNumber, cardExpiry, cardCvv);
      if (validationError) {
        setPaymentError(validationError);
        return;
      }
    }

    setPaymentError("");
    paymentLock.current = true;

    setIsProcessing(true);

    try {
      const concertIsBookable = await verifyConcertBeforePayment();
      if (!concertIsBookable) {
        setEventStatus("ended");
        paymentLock.current = false;
        setIsProcessing(false);
        alert("This concert has ended or its date could not be verified. No booking was saved.");
        return;
      }
    } catch (error) {
      console.error("Unable to verify concert before booking:", error);
      setEventStatus("unavailable");
      paymentLock.current = false;
      setIsProcessing(false);
      alert("Unable to verify the concert date. No booking was saved.");
      return;
    }

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

      const bookingSignature = JSON.stringify({
        concertId: String(concertId || ""),
        zoneId: String(zoneId || ""),
        seats: [...seats].map(String).sort(),
        userId: String(currentUser.uid || currentUser.userId || currentUser.id || ""),
      });
      const samePendingAttempt = localStorage.getItem("ticketHubPendingBookingSignature") === bookingSignature;
      let firebaseBookingKey = samePendingAttempt
        ? localStorage.getItem("ticketHubPendingBookingKey")
        : null;
      let bookingId = samePendingAttempt
        ? localStorage.getItem("ticketHubPendingBookingId")
        : null;

      if (!firebaseBookingKey || !bookingId) {
        firebaseBookingKey = push(ref(db, "bookings")).key;
        bookingId = "TH" + Date.now().toString().slice(-8);
        localStorage.setItem("ticketHubPendingBookingSignature", bookingSignature);
        localStorage.setItem("ticketHubPendingBookingKey", firebaseBookingKey);
        localStorage.setItem("ticketHubPendingBookingId", bookingId);
      }

      // =========================
      // BOOKING OBJECT
      // =========================

      const booking = {

        id: bookingId,

        ...(currentUser.uid || currentUser.userId || currentUser.id
          ? { userId: String(currentUser.uid || currentUser.userId || currentUser.id) }
          : {}),

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
          zoneName || zone || "",

        zoneId:
          zoneId || "",

        price:
          Number(price || 0),

        seats:
          seats,

        seatDetails: Array.isArray(bookingData.seatDetails) ? bookingData.seatDetails : [],

        total:
          Number(total || 0),

        paymentMethod:
          method,

        status:
          "Confirmed",

        paymentStatus:
          "Demo",

        createdAt:
          new Date().toISOString()
      };

      // =========================
      // SAVE TO FIREBASE
      // =========================

      await set(ref(db, `bookings/${firebaseBookingKey}`), booking);

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
      localStorage.removeItem("ticketHubPendingBookingSignature");
      localStorage.removeItem("ticketHubPendingBookingKey");
      localStorage.removeItem("ticketHubPendingBookingId");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");

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

      paymentLock.current = false;
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

          <div className="demo-payment-note" role="note">
            Demo payment only · No real charge will be made
          </div>

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
                onChange={(e) => {
                  setMethod(e.target.value);
                  setPaymentError("");
                }}
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
                  DEMO
                </div>

                <p>
                  QR payment is not connected in this demo.
                </p>

              </div>

            )}


            {/* CARD FORM */}

            {method === "card" && (

              <div className="card-form">

                <p className="demo-payment-note" role="note">
                  Demo card check only. Use test values; card details stay in this page and are never saved.
                </p>

                <label htmlFor="demo-card-number">
                  Card Number
                </label>

                <input
                  id="demo-card-number"
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  autoComplete="off"
                  value={cardNumber}
                  onChange={(event) => {
                    const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
                    setCardNumber(digits.replace(/(\d{4})(?=\d)/g, "$1 "));
                    setPaymentError("");
                  }}
                />

                <div className="card-row">

                  <div>

                    <label htmlFor="demo-card-expiry">
                      Expiry Date
                    </label>

                    <input
                      id="demo-card-expiry"
                      type="text"
                      placeholder="MM / YY"
                      maxLength="7"
                      inputMode="numeric"
                      autoComplete="off"
                      value={cardExpiry}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardExpiry(digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits);
                        setPaymentError("");
                      }}
                    />

                  </div>

                  <div>

                    <label htmlFor="demo-card-cvv">
                      CVV
                    </label>

                    <input
                      id="demo-card-cvv"
                      type="password"
                      inputMode="numeric"
                      placeholder="•••"
                      maxLength="4"
                      autoComplete="off"
                      value={cardCvv}
                      onChange={(event) => {
                        setCardCvv(event.target.value.replace(/\D/g, "").slice(0, 4));
                        setPaymentError("");
                      }}
                    />

                  </div>

                </div>

              </div>

            )}

            {paymentError && <p className="payment-error" role="alert">{paymentError}</p>}

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
              isProcessing || eventStatus !== "available"
            }
          >

            {isPaid
              ? "Demo Booking Saved"
              : isProcessing
              ? "Processing..."
              : `Confirm Demo Booking · ฿${Number(
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
