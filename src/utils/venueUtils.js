export const VENUE_STATUS_MAP = {
  1: {
    id: 1,
    slug: "confirmado",
    nombre: "Confirmado",
    color: "#22c55e", // Verde
  },
  2: {
    id: 2,
    slug: "solicitado",
    nombre: "Solicitado",
    color: "#eab308", // Amarillo
  },
  3: {
    id: 3,
    slug: "en-proceso",
    nombre: "En proceso",
    color: "#0ea5e9", // Celeste
  },
  4: {
    id: 4,
    slug: "autogestionado",
    nombre: "Autogestionado",
    color: "#2563eb", // Azul
  },
  5: {
    id: 5,
    slug: "cancelado",
    nombre: "Cancelado",
    color: "#ef4444", // Rojo
  },
};

export const VENUE_STATUS_OPTIONS = Object.values(VENUE_STATUS_MAP);

export const getVenueStatusById = (id) =>
  id ? VENUE_STATUS_MAP[Number(id)] || null : null;

