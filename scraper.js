import fs from "fs";
import axios from "axios";
import * as cheerio from "cheerio";

/* =========================
KONFIG
========================= */
const ROOMS = [
  {
    id: "P4.34",
    name: "P4.34",
    url: "https://www.trainex32.de/hmu24/public/ress_qr.cfm?con=781854&secur=3SB"
  }
];

/* =========================
HILFSFUNKTIONEN
========================= */
function cleanBookingText(text) {
  if (!text) return [];
  // Alles nach "Service powered by" entfernen
  const cleaned = text.split("Service powered by")[0];
  // Nach doppelten Zeilenumbrüchen splitten, trimmen und leere Strings entfernen
  const bookings = cleaned
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(s => s);
  // Maximal 7 Buchungen zurückgeben
  return bookings.slice(0, 7);
}

/* =========================
SCRAPER
========================= */
async function scrapeTrainexRoom(room) {
  try {
    const { data: html } = await axios.get(room.url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(html);
    const bodyText = $("body").text();
    const rawHtml = $("body").html() || "";

    // DEBUG: ersten 200 Zeichen ausgeben
    console.log(`DEBUG ${room.id} bodyText:`, bodyText.substring(0, 200));

    // Status bestimmen
    let status = "unbekannt";
    if (bodyText.toLowerCase().includes("derzeit frei")) status = "frei";
    if (bodyText.toLowerCase().includes("derzeit belegt")) status = "belegt";

    // Buchungen extrahieren
    const rawBookings = rawHtml
      .split("<br>")
      .map(line => cheerio.load(line).text().trim())
      .filter(line => line && /\d{2}\.\d{2}\.\d{2}/.test(line)); // nur Zeilen mit Datum

    const bookings = cleanBookingText(rawBookings.join("\n"));

    return {
      id: room.id,
      name: room.name,
      status,
      currentBooking: status === "belegt" ? bookings[0] || null : null,
      upcomingBookings: bookings,
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.error("❌ Fehler bei", room.id, err.message);
    return {
      id: room.id,
      name: room.name,
      error: true
    };
  }
}

/* =========================
MAIN
========================= */
async function run() {
  console.log("🔄 Scraping Trainex...");

  const results = [];

  for (const room of ROOMS) {
    const data = await scrapeTrainexRoom(room);
    results.push(data);
  }

  const output = {
    updatedAt: new Date().toISOString(),
    rooms: results
  };

  fs.writeFileSync("rooms.json", JSON.stringify(output, null, 2));
  console.log("✅ rooms.json geschrieben");
}

run();
