import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { ApplicationRow } from "@/lib/repositories/applications";

/**
 * Server-side PDF generation with pdf-lib.
 *
 * Why pdf-lib rather than Puppeteer or PDFKit:
 *   - no headless Chromium to install, boot or keep alive, so this runs in a
 *     serverless function inside ~50 ms and a few MB of memory;
 *   - it builds the document from primitives, so the output is deterministic —
 *     no CSS engine version can silently reflow a certificate;
 *   - it is pure JS with no native bindings, so the same code path works on
 *     local Node, Docker and any managed host.
 * The trade-off is manual layout, which is handled by the small helpers below.
 */

const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, points

const INK = rgb(0.09, 0.11, 0.18);
const MUTED = rgb(0.42, 0.45, 0.53);
const NAVY = rgb(0.13, 0.21, 0.42);
const ACCENT = rgb(0.06, 0.44, 0.36);
const HAIRLINE = rgb(0.82, 0.84, 0.88);
const WASH = rgb(0.96, 0.97, 0.99);

export type CertificatePdfInput = {
  application: ApplicationRow;
  documents: { doc_type: string; original_name: string; checksum_sha256: string }[];
  issuedTo: { email: string };
};

export async function buildCertificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const { application } = input;

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Provisional Certificate Acknowledgement — ${application.reference_number}`);
  pdf.setSubject("Provisional Certificate Application Acknowledgement");
  pdf.setAuthor("Office of the Registrar — Provisional Certificate Cell");
  pdf.setProducer("Provisional Certificate Portal (pdf-lib)");
  pdf.setCreator("Provisional Certificate Portal");
  pdf.setKeywords([application.reference_number, application.registration_number]);

  const page = pdf.addPage([PAGE.width, PAGE.height]);
  const serif = await pdf.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
  const sans = await pdf.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  drawFrame(page);
  drawWatermark(page, serifBold);

  let y = PAGE.height - 74;

  y = drawLetterhead(page, { serif, serifBold, sans, sansBold }, y);
  y = drawTitleBlock(page, { serif, serifBold, sans, sansBold }, y, application);
  y = drawReferenceBanner(page, { sans, sansBold }, y, application);
  y = drawDetailsTable(page, { sans, sansBold }, y, application);
  y = drawDocumentsTable(page, { sans, sansBold }, y, input.documents);
  drawFooter(page, { serif, sans, sansBold }, input, y);

  return pdf.save();
}

type Fonts = { serif?: PDFFont; serifBold?: PDFFont; sans: PDFFont; sansBold: PDFFont };

/* ------------------------------------------------------------------ layout */

function drawFrame(page: PDFPage) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });
  // Double rule border, the way a printed government form looks.
  page.drawRectangle({
    x: 26,
    y: 26,
    width: PAGE.width - 52,
    height: PAGE.height - 52,
    borderColor: NAVY,
    borderWidth: 1.4,
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: PAGE.width - 64,
    height: PAGE.height - 64,
    borderColor: HAIRLINE,
    borderWidth: 0.6,
  });
  // Corner ticks.
  for (const [cx, cy] of [
    [32, 32],
    [PAGE.width - 32, 32],
    [32, PAGE.height - 32],
    [PAGE.width - 32, PAGE.height - 32],
  ]) {
    page.drawCircle({ x: cx, y: cy, size: 2.4, color: NAVY });
  }
}

function drawWatermark(page: PDFPage, font?: PDFFont) {
  if (!font) return;
  page.drawText("PROVISIONAL", {
    x: 96,
    y: 250,
    size: 68,
    font,
    color: rgb(0.13, 0.21, 0.42),
    opacity: 0.06,
    rotate: degrees(38),
  });
}

function drawLetterhead(page: PDFPage, fonts: Fonts, top: number): number {
  const centerX = PAGE.width / 2;

  // Seal: concentric rings with a monogram, drawn rather than embedded so the
  // PDF stays a single self-contained file with no external assets.
  const sealY = top - 4;
  page.drawCircle({ x: centerX, y: sealY, size: 21, borderColor: NAVY, borderWidth: 1.2 });
  page.drawCircle({ x: centerX, y: sealY, size: 16.5, borderColor: NAVY, borderWidth: 0.5 });
  page.drawCircle({ x: centerX, y: sealY, size: 13, color: WASH });
  const monogram = "PC";
  page.drawText(monogram, {
    x: centerX - fonts.sansBold.widthOfTextAtSize(monogram, 13) / 2,
    y: sealY - 4.6,
    size: 13,
    font: fonts.sansBold,
    color: NAVY,
  });

  let y = sealY - 44;
  y = centeredText(page, "OFFICE OF THE REGISTRAR", {
    y,
    size: 13.5,
    font: fonts.sansBold,
    color: NAVY,
    spacingAfter: 15,
    tracking: 1.6,
  });
  y = centeredText(page, "Provisional Certificate Cell", {
    y,
    size: 10.5,
    font: fonts.sans,
    color: MUTED,
    spacingAfter: 18,
  });

  page.drawLine({
    start: { x: 70, y },
    end: { x: PAGE.width - 70, y },
    thickness: 0.8,
    color: NAVY,
  });

  return y - 30;
}

function drawTitleBlock(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  application: ApplicationRow
): number {
  let y = centeredText(page, "APPLICATION ACKNOWLEDGEMENT", {
    y: top,
    size: 17,
    font: fonts.serifBold ?? fonts.sansBold,
    color: INK,
    spacingAfter: 16,
    tracking: 0.6,
  });

  y = centeredText(
    page,
    "This acknowledges receipt of the application for a Provisional Certificate",
    { y, size: 9.8, font: fonts.sans, color: MUTED, spacingAfter: 26 }
  );

  const label = application.status === "COMPLETED" ? "ACCEPTED FOR PROCESSING" : "SUBMITTED";
  const chipWidth = fonts.sansBold.widthOfTextAtSize(label, 8.4) + 22;
  const chipX = (PAGE.width - chipWidth) / 2;
  page.drawRectangle({
    x: chipX,
    y: y - 4,
    width: chipWidth,
    height: 18,
    color: rgb(0.93, 0.97, 0.95),
    borderColor: ACCENT,
    borderWidth: 0.6,
  });
  page.drawText(label, {
    x: chipX + 11,
    y: y + 1.4,
    size: 8.4,
    font: fonts.sansBold,
    color: ACCENT,
  });

  return y - 30;
}

function drawReferenceBanner(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  application: ApplicationRow
): number {
  const x = 56;
  const width = PAGE.width - 112;
  const height = 54;
  const y = top - height;

  page.drawRectangle({ x, y, width, height, color: WASH, borderColor: HAIRLINE, borderWidth: 0.6 });
  page.drawRectangle({ x, y, width: 3.2, height, color: NAVY });

  page.drawText("APPLICATION REFERENCE NUMBER", {
    x: x + 18,
    y: y + height - 20,
    size: 7.6,
    font: fonts.sansBold,
    color: MUTED,
  });
  page.drawText(application.reference_number, {
    x: x + 18,
    y: y + 14,
    size: 18,
    font: fonts.sansBold,
    color: NAVY,
  });

  const serial = application.certificate_serial ?? "—";
  const serialLabel = "CERTIFICATE SERIAL";
  page.drawText(serialLabel, {
    x: x + width - 18 - fonts.sansBold.widthOfTextAtSize(serialLabel, 7.6),
    y: y + height - 20,
    size: 7.6,
    font: fonts.sansBold,
    color: MUTED,
  });
  page.drawText(serial, {
    x: x + width - 18 - fonts.sans.widthOfTextAtSize(serial, 11),
    y: y + 15,
    size: 11,
    font: fonts.sans,
    color: INK,
  });

  return y - 26;
}

function drawDetailsTable(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  application: ApplicationRow
): number {
  const rows: [string, string][] = [
    ["Applicant name", application.full_name],
    ["Date of birth", formatDate(application.date_of_birth)],
    ["Gender", application.gender || "Not specified"],
    ["Registration number", application.registration_number],
    ["Course / programme", application.course_name],
    ["Institution", application.institution_name],
    ["Year of passing", String(application.year_of_passing)],
    ["Email", application.email],
    ["Phone", application.phone],
    ["Correspondence address", formatAddress(application)],
  ];

  return drawSection(page, fonts, top, "APPLICANT DETAILS", rows);
}

function drawDocumentsTable(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  documents: CertificatePdfInput["documents"]
): number {
  const labels: Record<string, string> = {
    ID_PROOF: "ID proof",
    DEGREE_CERTIFICATE: "Degree certificate",
  };

  const rows: [string, string][] = documents.length
    ? documents.map((doc) => [
        labels[doc.doc_type] ?? doc.doc_type,
        `${truncate(doc.original_name, 42)}  ·  sha256 ${doc.checksum_sha256.slice(0, 12)}…`,
      ])
    : [["Documents", "None on record"]];

  return drawSection(page, fonts, top, "DOCUMENTS RECEIVED", rows);
}

function drawSection(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  heading: string,
  rows: [string, string][]
): number {
  const x = 56;
  const width = PAGE.width - 112;
  const labelWidth = 152;
  const rowHeight = 22;

  page.drawText(heading, {
    x,
    y: top,
    size: 8,
    font: fonts.sansBold,
    color: NAVY,
  });
  page.drawLine({
    start: { x, y: top - 7 },
    end: { x: x + width, y: top - 7 },
    thickness: 0.6,
    color: HAIRLINE,
  });

  let y = top - 7;

  rows.forEach(([label, value], index) => {
    const rowTop = y;
    const rowBottom = rowTop - rowHeight;

    if (index % 2 === 0) {
      page.drawRectangle({ x, y: rowBottom, width, height: rowHeight, color: rgb(0.985, 0.988, 0.996) });
    }

    page.drawText(label.toUpperCase(), {
      x: x + 8,
      y: rowBottom + 7.5,
      size: 7.4,
      font: fonts.sansBold,
      color: MUTED,
    });

    const lines = wrap(value, fonts.sans, 9.6, width - labelWidth - 20);
    lines.slice(0, 2).forEach((line, lineIndex) => {
      page.drawText(line, {
        x: x + labelWidth,
        y: rowBottom + (lines.length > 1 ? 12.5 - lineIndex * 10 : 7),
        size: 9.6,
        font: fonts.sans,
        color: INK,
      });
    });

    page.drawLine({
      start: { x, y: rowBottom },
      end: { x: x + width, y: rowBottom },
      thickness: 0.4,
      color: HAIRLINE,
    });

    y = rowBottom;
  });

  return y - 26;
}

function drawFooter(
  page: PDFPage,
  fonts: Fonts,
  input: CertificatePdfInput,
  top: number
) {
  const { application } = input;
  const x = 56;
  const width = PAGE.width - 112;

  const issuedAt = application.certificate_issued_at ?? application.submitted_at;
  // The declaration follows straight on from the last table (larger y is higher
  // up the page, so `top` is already below it); the signature block stays
  // pinned to the bottom of the page.
  const declarationTop = top;

  page.drawText("DECLARATION", {
    x,
    y: declarationTop,
    size: 8,
    font: fonts.sansBold,
    color: NAVY,
  });

  const declaration =
    "The applicant has declared the information above to be true and has uploaded the supporting documents listed. " +
    "This acknowledgement confirms receipt of the application only; it is not itself a Provisional Certificate.";
  wrap(declaration, fonts.sans, 8.6, width).forEach((line, index) => {
    page.drawText(line, {
      x,
      y: declarationTop - 16 - index * 11,
      size: 8.6,
      font: fonts.sans,
      color: MUTED,
    });
  });

  page.drawLine({
    start: { x, y: 96 },
    end: { x: x + width, y: 96 },
    thickness: 0.6,
    color: HAIRLINE,
  });

  const generated = `Generated ${formatDateTime(issuedAt)} (IST)`;
  page.drawText(generated, { x, y: 80, size: 8.2, font: fonts.sans, color: MUTED });
  page.drawText(`Issued to ${input.issuedTo.email}`, {
    x,
    y: 68,
    size: 8.2,
    font: fonts.sans,
    color: MUTED,
  });

  const verify = `Verify with reference ${application.reference_number}`;
  page.drawText(verify, {
    x: x + width - fonts.sans.widthOfTextAtSize(verify, 8.2),
    y: 80,
    size: 8.2,
    font: fonts.sans,
    color: MUTED,
  });

  const signature = "Authorised Signatory";
  page.drawLine({
    start: { x: x + width - 150, y: 62 },
    end: { x: x + width - 10, y: 62 },
    thickness: 0.6,
    color: INK,
  });
  page.drawText(signature, {
    x: x + width - 10 - fonts.sans.widthOfTextAtSize(signature, 8.2),
    y: 50,
    size: 8.2,
    font: fonts.sans,
    color: MUTED,
  });

  const notice = "This is a system-generated document. No physical signature is required.";
  page.drawText(notice, { x, y: 50, size: 7.6, font: fonts.sans, color: MUTED });
}

/* ----------------------------------------------------------------- helpers */

function centeredText(
  page: PDFPage,
  text: string,
  options: {
    y: number;
    size: number;
    font: PDFFont;
    color: ReturnType<typeof rgb>;
    spacingAfter: number;
    tracking?: number;
  }
): number {
  const { size, font, tracking = 0 } = options;

  // pdf-lib has no letter-spacing option, so tracked text is drawn glyph by
  // glyph. Used only for the small-caps letterhead lines.
  if (tracking > 0) {
    const total =
      font.widthOfTextAtSize(text, size) + tracking * Math.max(text.length - 1, 0);
    let cursor = (PAGE.width - total) / 2;
    for (const character of text) {
      page.drawText(character, { x: cursor, y: options.y, size, font, color: options.color });
      cursor += font.widthOfTextAtSize(character, size) + tracking;
    }
    return options.y - options.spacingAfter;
  }

  page.drawText(text, {
    x: (PAGE.width - font.widthOfTextAtSize(text, size)) / 2,
    y: options.y,
    size,
    font,
    color: options.color,
  });
  return options.y - options.spacingAfter;
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}

function formatAddress(application: ApplicationRow): string {
  return [
    application.address_line1,
    application.address_line2,
    application.city,
    application.state,
    application.postal_code,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatDate(value: string | Date): string {
  const date = typeof value === "string" ? new Date(`${value}T00:00:00Z`) : value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
