"""
generate-ics.py
Parses NOTION_EVENTS from neighborly-calendar.html and writes
a RFC-5545-compliant neighborly-calendar.ics file.
Run locally or via GitHub Actions.
"""
import re, datetime

CATS = {
    'campaign': 'Email / SMS',
    'social':   'Social',
    'keydate':  'Key date',
    'ops':      'Ops / Print',
    'event':    'Event',
    'bizupdate':'Biz update',
    'launch':   'Launch',
}

def esc(s):
    return str(s or '').replace('\\','\\\\').replace(';',r'\;').replace(',',r'\,').replace('\n',r'\n')

def fold(line):
    """RFC 5545: fold lines longer than 75 octets."""
    encoded = line.encode('utf-8')
    if len(encoded) <= 75:
        return line
    result, buf, limit = [], b'', 75
    for ch in line:
        ch_b = ch.encode('utf-8')
        if len(buf) + len(ch_b) > limit:
            result.append(buf.decode('utf-8'))
            buf, limit = b' ', 74
        buf += ch_b
    if buf:
        result.append(buf.decode('utf-8'))
    return '\r\n'.join(result)

def get_field(text, field):
    m = re.search(r'\b' + field + r"\s*:\s*'((?:[^'\\]|\\.)*)'", text)
    if m:
        return m.group(1).replace("\\'", "'")
    m = re.search(r'\b' + field + r'\s*:\s*(true|false)\b', text)
    if m:
        return m.group(1) == 'true'
    return None

# ── Parse events from HTML ────────────────────────────────────────────────────
html = open('neighborly-calendar.html', encoding='utf-8').read()
raw  = re.search(r'const NOTION_EVENTS = \[([\s\S]*?)\];\s*\n', html).group(1)
chunks = re.split(r'\},\s*\n\s*\{', raw)

stamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')

lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Neighborly//Marketing Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Neighborly Marketing Calendar',
    'X-WR-CALDESC:Marketing events for Neighborly',
    'X-WR-TIMEZONE:America/Los_Angeles',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
]

count = 0
for chunk in chunks:
    eid   = get_field(chunk, 'id')
    name  = get_field(chunk, 'name')
    start = get_field(chunk, 'start')
    end   = get_field(chunk, 'end')
    cat   = get_field(chunk, 'cat')
    sub   = get_field(chunk, 'sub')
    notes = get_field(chunk, 'notes')
    hold  = get_field(chunk, 'hold')
    if not (eid and name and start and end):
        continue

    dtstart   = start.replace('-', '')
    end_d     = datetime.datetime.strptime(end, '%Y-%m-%d') + datetime.timedelta(days=1)
    dtend     = end_d.strftime('%Y%m%d')
    cat_label = CATS.get(cat or '', cat or '')

    desc_parts = ([f"Category: {cat_label}"] if cat_label else [])
    if sub:   desc_parts.append(f"Channel: {sub}")
    if notes: desc_parts.append(f"Notes: {notes}")
    if hold:  desc_parts.append("Status: HOLD")

    lines.append('BEGIN:VEVENT')
    lines.append(f"UID:{eid}@neighborlyeats.com")
    lines.append(f"DTSTART;VALUE=DATE:{dtstart}")
    lines.append(f"DTEND;VALUE=DATE:{dtend}")
    lines.append(f"DTSTAMP:{stamp}")
    prefix = f"[{cat_label}] " if cat_label else ""
    lines.append(f"SUMMARY:{esc(prefix + name + (' [HOLD]' if hold else ''))}")
    if desc_parts:
        lines.append(f"DESCRIPTION:{esc(chr(10).join(desc_parts))}")
    if cat_label:
        lines.append(f"CATEGORIES:{esc(cat_label)}")
    lines.append('TRANSP:TRANSPARENT')
    lines.append('STATUS:CONFIRMED')
    lines.append('END:VEVENT')
    count += 1

lines.append('END:VCALENDAR')

content = '\r\n'.join(fold(l) for l in lines)
with open('neighborly-calendar.ics', 'w', encoding='utf-8', newline='') as f:
    f.write(content)

print(f"✓ {count} events → neighborly-calendar.ics")
