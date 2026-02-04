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
   SCRAPER
========================= */

async function scrapeTrainexRoom(room) {
  try {
    const { data: html } = await axios.get(room.url, {
      timeout: 15000,
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(html);
    const bodyText = $("body").text().toLowerCase();

    let status = "unbekannt";
    if (bodyText.includes("derzeit frei")) status = "frei";
    if (bodyText.includes("derzeit belegt")) status = "belegt";

    // Buchungen extrahieren
    const rawHtml = $("body").html() || "";
    const bookings = rawHtml
      .split("<br>")
      .map(line => cheerio.load(line).text().trim())
      .filter(line => line && /\d{2}\.\d{2}\.\d{2}/.test(line));

    return {
      id: room.id,
      name: room.name,
      status,
      currentBooking: status === "belegt" ? bookings[0] || null : null,
      upcomingBookings: bookings
    };
  } catch (err) {
    console.error(`❌ Fehler bei Raum ${room.id}:`, err.message);
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
