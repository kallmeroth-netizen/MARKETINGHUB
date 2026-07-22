// api/calendar.js — Vercel Serverless Function
// Serves a live iCal (.ics) feed from Firebase Realtime Database.
// Google Calendar can subscribe to webcal://<your-domain>/api/calendar
// and will poll this endpoint to stay in sync.

const FIREBASE_URL =
  'https://neighborly-hub-53e4b-default-rtdb.firebaseio.com/marketing-calendar.json';

// Map internal category keys to a readable string for the CATEGORIES field
const CAT_LABELS = {
  email:     'Email',
  campaign:  'SMS',
  social:    'Social',
  keydate:   'Key date',
  ops:       'Ops / Print',
  event:     'Event',
  bizupdate: 'Biz update',
  launch:    'Launch',
  influencer:'Influencer',
};

function escIcal(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

// Convert YYYY-MM-DD to iCal DATE value (all-day event)
function toIcalDate(dateStr) {
  if (!dateStr) return null;
  // Handle ISO datetime strings too
  return dateStr.replace(/-/g, '').substring(0, 8);
}

// Generate a stable UID from event id + domain
function makeUID(id) {
  return `${id}@neighborly-marketing-hub`;
}

// Format now as iCal DTSTAMP
function nowStamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export default async function handler(req, res) {
  // Allow Google Calendar and other CalDAV clients to subscribe
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'inline; filename="neighborly-marketing.ics"');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let data;
  try {
    const fbRes = await fetch(FIREBASE_URL);
    if (!fbRes.ok) throw new Error('Firebase fetch failed: ' + fbRes.status);
    data = await fbRes.json();
  } catch (err) {
    res.status(502).send('Error fetching calendar data: ' + err.message);
    return;
  }

  const events = Array.isArray(data?.events)
    ? data.events
    : Object.values(data?.events || {});

  const stamp = nowStamp();
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neighborly Marketing Hub//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Neighborly Marketing Calendar',
    'X-WR-CALDESC:Neighborly marketing campaigns and key dates',
    'X-WR-TIMEZONE:America/Los_Angeles',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];

  for (const ev of events) {
    if (!ev || !ev.id || !ev.start) continue;

    const startDate = toIcalDate(ev.start);
    if (!startDate) continue;

    // iCal all-day events: DTEND is the day AFTER the last day
    const endDate = ev.end && ev.end !== ev.start
      ? toIcalDate(ev.end)
      : startDate;

    // Increment end date by 1 for exclusive end in iCal
    let endDateExclusive = endDate;
    try {
      const d = new Date(ev.end || ev.start);
      d.setDate(d.getDate() + 1);
      endDateExclusive = d.toISOString().replace(/-/g, '').substring(0, 8);
    } catch (e) {}

    const catLabel = CAT_LABELS[ev.cat] || ev.cat || '';
    const summary = escIcal(ev.name || 'Untitled');
    const description = [
      catLabel ? 'Category: ' + catLabel : '',
      ev.sub ? 'Type: ' + ev.sub : '',
      ev.notes ? 'Notes: ' + ev.notes : '',
      ev.hold ? '⚠️ HOLD' : '',
      ev.depts && ev.depts.length ? 'Depts: ' + ev.depts.join(', ') : '',
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + makeUID(ev.id));
    lines.push('DTSTAMP:' + stamp);
    const tm = ev.time && /^(\d{1,2}):(\d{2})/.exec(ev.time);
    if (tm) {
      const hh = String(+tm[1]).padStart(2, '0');
      const mm = tm[2];
      const eh = String((+tm[1] + 1) % 24).padStart(2, '0');
      lines.push('DTSTART;TZID=America/Los_Angeles:' + startDate + 'T' + hh + mm + '00');
      lines.push('DTEND;TZID=America/Los_Angeles:' + startDate + 'T' + eh + mm + '00');
    } else {
      lines.push('DTSTART;VALUE=DATE:' + startDate);
      lines.push('DTEND;VALUE=DATE:' + endDateExclusive);
    }
    lines.push('SUMMARY:' + summary);
    if (description) lines.push('DESCRIPTION:' + description);
    if (catLabel) lines.push('CATEGORIES:' + escIcal(catLabel));
    if (ev.hold) lines.push('STATUS:TENTATIVE');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // iCal lines must be folded at 75 octets
  const folded = lines.map(line => {
    if (line.length <= 75) return line;
    let result = '';
    let remaining = line;
    result += remaining.substring(0, 75);
    remaining = remaining.substring(75);
    while (remaining.length > 0) {
      result += '\r\n ' + remaining.substring(0, 74);
      remaining = remaining.substring(74);
    }
    return result;
  });

  res.status(200).send(folded.join('\r\n') + '\r\n');
}
