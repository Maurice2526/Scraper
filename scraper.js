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
  const { data: html } = await axios.get(room.url, {
    timeout: 20000,
    headers: {
      "User-Agent": "Mozilla/5.0"
    }
  });

  const $ = cheerio.load(html);

  /* ===== STATUS ===== */

  const statusText = $(
    "body > table:nth-child(3) > tbody > tr:nth-child(1) > td > font"
  )
    .text()
    .toLowerCase();

  let status = "unbekannt";
  if (statusText.includes("derzeit frei")) status = "frei";
  if (statusText.includes("derzeit belegt")) status = "belegt";

  /* ===== BOOKINGS ===== */

  const bookings = [];

  $("body > b").each((i, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();

    if (text && /\d{2}\.\d{2}\.\d{2}/.test(text)) {
      bookings.push(text);
    }
  });

  return {
    id: room.id,
    name: room.name,
    status,
    currentBooking: status === "belegt" ? bookings[0] || null : null,
    upcomingBookings: bookings
  };
}

/* =========================
   MAIN
========================= */

async function run() {
  console.log("🔄 Starte Scraper...");

  const results = [];

  for (const room of ROOMS) {
    try {
      const data = await scrapeTrainexRoom(room);
      results.push(data);
      console.log("✅", room.id, "OK");
    } catch (err) {
      console.error("❌ Fehler bei", room.id, err.message);
      results.push({
        id: room.id,
        name: room.name,
        error: true
      });
    }
  }

  const output = {
    updatedAt: new Date().toISOString(),
    rooms: results
  };

  fs.writeFileSync("rooms.json", JSON.stringify(output, null, 2));
  console.log("💾 rooms.json geschrieben");
}

run();
