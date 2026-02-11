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
  maxRedirects: 5,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",

    "Accept":
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",

    "Accept-Language":
      "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",

    "Accept-Encoding": "gzip, deflate, br",

    "Connection": "keep-alive",

    "Cache-Control": "max-age=0",

    "Upgrade-Insecure-Requests": "1",

    "Referer": "https://www.trainex32.de/",

    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1"
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

      console.log("Status:", err.response?.status);
      console.log("Headers:", err.response?.headers);
      console.log("Data:", err.response?.data);
       
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

