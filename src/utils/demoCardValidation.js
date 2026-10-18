export function validateDemoCardDetails(cardNumber, cardExpiry, cardCvv) {
  const digits = String(cardNumber || "").replace(/\D/g, "");
  if (digits.length !== 16) {
    return "Enter a 16-digit demo card number.";
  }

  const [monthText, yearText] = String(cardExpiry || "").split("/").map((part) => part.trim());
  const month = Number(monthText);
  const year = Number(yearText);
  const expiryDate = month >= 1 && month <= 12 && yearText?.length === 2
    ? new Date(2000 + year, month, 0, 23, 59, 59)
    : null;

  if (!expiryDate || expiryDate < new Date()) {
    return "Enter a valid future expiry date (MM / YY).";
  }

  if (!/^\d{3,4}$/.test(String(cardCvv || ""))) {
    return "Enter a 3 or 4 digit demo security code.";
  }

  return "";
}
