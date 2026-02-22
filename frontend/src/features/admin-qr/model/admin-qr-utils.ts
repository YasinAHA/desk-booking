export function buildDeskQrImageUrl(qrPublicId: string): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(qrPublicId)}&size=200`;
}
