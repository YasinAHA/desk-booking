function buildDeskQrPayload(qrPublicId: string): string {
  const url = new URL("/check-in", globalThis.location.origin);
  url.searchParams.set("qrPublicId", qrPublicId);
  return url.toString();
}

export function buildDeskQrImageUrl(qrPublicId: string): string {
  const payload = buildDeskQrPayload(qrPublicId);
  return `https://quickchart.io/qr?text=${encodeURIComponent(payload)}&size=200`;
}

type QrPrintableItem = {
  code: string;
  name: string | null;
  qrPublicId: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPrintDocumentHtml(title: string, items: QrPrintableItem[]): string {
  const cards = items
    .map(item => {
      const imageUrl = buildDeskQrImageUrl(item.qrPublicId);
      const safeCode = escapeHtml(item.code);
      const safeName = escapeHtml(item.name ?? "Sin nombre");
      const safeQr = escapeHtml(item.qrPublicId);
      return `
        <article class="card">
          <h2>${safeCode}</h2>
          <p>${safeName}</p>
          <img src="${imageUrl}" alt="QR ${safeCode}" />
          <code>${safeQr}</code>
        </article>
      `;
    })
    .join("");

  return `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          :root { color-scheme: light; }
          body {
            margin: 0;
            padding: 24px;
            font-family: "Segoe UI", system-ui, sans-serif;
            color: #111827;
            background: #ffffff;
          }
          h1 {
            margin: 0 0 16px;
            font-size: 20px;
            font-weight: 700;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
            gap: 12px;
          }
          .card {
            border: 1px solid #d1d5db;
            border-radius: 10px;
            padding: 12px;
            break-inside: avoid;
            display: grid;
            gap: 8px;
          }
          .card h2 {
            margin: 0;
            font-size: 16px;
          }
          .card p {
            margin: 0;
            color: #4b5563;
            font-size: 13px;
          }
          .card img {
            width: 180px;
            height: 180px;
            object-fit: contain;
          }
          .card code {
            font-size: 12px;
            word-break: break-all;
          }
          @media print {
            body { padding: 8px; }
          }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <section class="grid">${cards}</section>
        <script>
          (() => {
            const images = Array.from(document.images);
            let pending = images.length;
            let done = false;

            const printNow = () => {
              if (done) return;
              done = true;
              window.focus();
              window.print();
            };

            if (pending === 0) {
              setTimeout(printNow, 80);
            } else {
              for (const image of images) {
                const settle = () => {
                  pending -= 1;
                  if (pending <= 0) {
                    setTimeout(printNow, 80);
                  }
                };
                image.addEventListener("load", settle, { once: true });
                image.addEventListener("error", settle, { once: true });
              }
            }

            setTimeout(printNow, 2500);
          })();
        </script>
      </body>
    </html>
  `;
}

export function printDeskQrs(title: string, items: QrPrintableItem[]): boolean {
  if (items.length === 0) {
    return false;
  }

  const html = buildPrintDocumentHtml(title, items);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const printUrl = URL.createObjectURL(blob);
  const printWindow = globalThis.open(
    printUrl,
    "_blank",
    "width=1024,height=768"
  );

  if (!printWindow) {
    URL.revokeObjectURL(printUrl);
    return false;
  }
  globalThis.setTimeout(() => {
    URL.revokeObjectURL(printUrl);
  }, 10000);

  return true;
}
