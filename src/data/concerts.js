export const defaultConcerts = [
  {
    id: "C001",
    name: "Summer Music Festival",
    artist: "BUS",
    date: "2026-09-12",
    venue: "IMPACT Arena",
    price: 1500,
    description:
      "A summer night filled with music, energy and unforgettable moments with BUS.",
    image: "/images/bus.jpg",

    zones: [
      {
        id: "VIP",
        name: "VIP",
        price: 2500,
        rows: 2,
        seatsPerRow: 8
      },
      {
        id: "A",
        name: "Regular A",
        price: 1800,
        rows: 3,
        seatsPerRow: 10
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
    image: "/images/lykn.jpg",

    zones: [
      {
        id: "A",
        name: "Regular A",
        price: 1800,
        rows: 3,
        seatsPerRow: 10
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
    image: "/images/proxie.jpg",

    zones: [
      {
        id: "A",
        name: "Regular A",
        price: 1200,
        rows: 3,
        seatsPerRow: 10
      }
    ]
  }
];