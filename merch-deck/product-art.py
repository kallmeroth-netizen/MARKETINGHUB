# Flat vector renderings of each product, drawn from the reference shots.
OUT = 'rgba(31,35,40,.22)'

def _cap(crown, brim, seam, lines, extra='', mesh=None):
    # brim first, crown painted over it so the join is hidden
    body = (f'<path d="M26,96 C18,124 54,140 100,140 C146,140 182,124 174,96 Z" '
            f'fill="{brim}" stroke="{OUT}"/>'
            f'<path d="M40,104 C40,58 64,36 100,36 C136,36 160,58 160,104 Z" '
            f'fill="{crown}" stroke="{OUT}"/>')
    if mesh:
        d = 'M118,41 C144,52 160,74 160,104 L118,104 Z'
        body += f'<path d="{d}" fill="{mesh}"/><path d="{d}" fill="url(#mesh)"/>'
    body += (f'<circle cx="100" cy="34" r="4.5" fill="{crown}" stroke="{OUT}"/>'
             f'<path d="M100,37 L100,104" stroke="{seam}" stroke-width="1" fill="none" opacity=".45"/>'
             f'<circle cx="76" cy="66" r="2.2" fill="{seam}" opacity=".5"/>'
             f'<circle cx="124" cy="66" r="2.2" fill="{seam}" opacity=".5"/>')
    return body + lines + extra

def cap(crown, brim=None, seam=OUT, text=None, tc='#fff', size=13, fam='sans',
        two=None, mesh=None, badge=None, weight='600', ls='.06em'):
    brim = brim or crown
    fam = {'sans':"'DM Sans',sans-serif",'script':"'Tuppence',Georgia,serif",
           'display':"'TAYAmaya','DM Sans',sans-serif"}[fam]
    L = ''
    if badge:
        bt, bc = badge
        L += f'<circle cx="100" cy="74" r="25" fill="none" stroke="{bc}" stroke-width="3"/>'
        for i, w in enumerate(bt):
            L += (f'<text x="100" y="{67+i*11}" text-anchor="middle" font-family="{fam}" font-size="10.5" '
                  f'font-weight="700" fill="{bc}" letter-spacing=".04em">{w}</text>')
    elif two:
        for i, w in enumerate(two):
            L += (f'<text x="100" y="{68+i*16}" text-anchor="middle" font-family="{fam}" font-size="{size}" '
                  f'font-weight="{weight}" fill="{tc}" letter-spacing="{ls}">{w}</text>')
    elif text:
        L += (f'<text x="100" y="76" text-anchor="middle" font-family="{fam}" font-size="{size}" '
              f'font-weight="{weight}" fill="{tc}" letter-spacing="{ls}">{text}</text>')
    return _cap(crown, brim, seam, L, mesh=mesh)

def tote(body, text=None, tc='#1f2328', size=13, fam='sans', badge=None,
         weight='700', ls='.08em', handle=None, tag=None):
    handle = handle or body
    fam = {'sans':"'DM Sans',sans-serif",'display':"'TAYAmaya','DM Sans',sans-serif"}[fam]
    s = (f'<path d="M66,64 C66,22 134,22 134,64" fill="none" stroke="{handle}" stroke-width="7" '
         f'stroke-linecap="round"/>'
         f'<path d="M42,62 L158,62 L151,168 L49,168 Z" fill="{body}" stroke="{OUT}"/>')
    if tag:
        s += f'<rect x="70" y="66" width="15" height="11" rx="1.5" fill="none" stroke="{tag}" stroke-width="1.2"/>'
    if badge:
        ring, lotus, label = badge
        s += (f'<circle cx="100" cy="112" r="33" fill="none" stroke="{ring}" stroke-width="4"/>'
              f'<circle cx="100" cy="112" r="28" fill="none" stroke="{lotus}" stroke-width="1.5" opacity=".5"/>')
        for a, r in [(-30,10),(-12,14),(12,14),(30,10)]:
            s += (f'<ellipse cx="{100+a*0.55:.1f}" cy="{112+2}" rx="4.2" ry="{r}" fill="{lotus}" '
                  f'transform="rotate({a} 100 114)" opacity=".9"/>')
        s += (f'<text x="100" y="92" text-anchor="middle" font-family="{fam}" font-size="6.2" font-weight="700" '
              f'fill="{ring}" letter-spacing=".02em">SUNLIFE ORGANICS</text>'
              f'<text x="100" y="140" text-anchor="middle" font-family="{fam}" font-size="6.2" font-weight="700" '
              f'fill="{ring}" letter-spacing=".05em">{label}</text>')
    elif text:
        s += (f'<text x="100" y="118" text-anchor="middle" font-family="{fam}" font-size="{size}" '
              f'font-weight="{weight}" fill="{tc}" letter-spacing="{ls}">{text}</text>')
    return s

def svg(inner, label, vb="26 26 148 122"):
    return (f'<svg viewBox="{vb}" role="img" aria-label="{label}" style="display:block;width:100%;height:auto">'
            f'<defs><pattern id="mesh" width="5" height="5" patternUnits="userSpaceOnUse">'
            f'<circle cx="2.5" cy="2.5" r="1" fill="rgba(31,35,40,.13)"/></pattern></defs>'
            f'{inner}</svg>')
