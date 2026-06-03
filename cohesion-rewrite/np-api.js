/* np-api.js — single source of truth for backend wiring. Design-neutral. */
const API_BASE = '/api';
const API_KEY  = (typeof window !== 'undefined' && window.NP_API_KEY) || '';
const LOCATIONS = {
  westlake:   '417501a4-3ffb-41d2-9539-a1b87855a869',
  brentwood:  '74dacac4-6208-4388-9612-39b46df05359',
  commissary: 'a6727f10-4ae5-44d7-9cd1-5f65d8a2d509',
};
const FISCAL_CUTOFF = new Date(2026, 0, 7);
const PMIX_KEYS = {
  "What's Gaby Cooking": 'whatsGabyCooking',
  'Mini Kabob':          'miniKabob',
  'Social Monk':         'socialMonk',
  'Mixtape':             'mixtape',
  'Palermo Pizza Club':  'palermoPizzaClub',
  'Neighborly Cookies':  'neighborlyCookies',
  'Marketplace':         'marketplace',
  'Catering':            'catering',
  'Beverages':           'beverages',
  'Wine':                'wine',
  'Beer':                'beer',
};
const CH_KEYS = {
  'dine_in':      'dineIn',
  'marketplace':  'marketplace',
  'kiosk_takeout':'kioskTakeOut',
  'web_delivery': 'webDelivery',
  'web_takeout':  'webTakeOut',
  'curbside':     'curbside',
  'delivery_3p':  'thirdParty',
  'catering':     'catering',
};
async function apiGet(path) {
  const r = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${window.NP_API_KEY || ''}` },
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
}
window.NPApi = { API_BASE, LOCATIONS, FISCAL_CUTOFF, PMIX_KEYS, CH_KEYS, apiGet };
