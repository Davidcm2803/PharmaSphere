const crc = new Intl.NumberFormat("es-CR", {
  style: "currency",
  currency: "CRC",
  maximumFractionDigits: 0,
});

export const formatPrice = (value) => crc.format(Number(value) || 0);