// Scheduling core: pure functions, no DOM. Dates are 'YYYY-MM-DD' strings (local, no timezone maths).
(function (root) {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
  function addMonths(s, n) {            // clamps to month end (31 Aug + 6m = 28/29 Feb)
    const d = parse(s), day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last)); return iso(d);
  }
  const isWeekend = s => [0, 6].includes(parse(s).getDay());
  const isOff = (s, hol) => isWeekend(s) || hol.includes(s);
  function nextWorking(s, hol) { while (isOff(s, hol)) s = addDays(s, 1); return s; }
  function prevWorking(s, hol) { while (isOff(s, hol)) s = addDays(s, -1); return s; }
  // Working day strictly before the event (Mon event -> Fri, unless Fri is a holiday)
  const reminderDay = (s, hol) => prevWorking(addDays(s, -1), hol);

  // Events generated from an anchor date, `years` ahead (default 10, inclusive of the final anniversary).
  function generate(mod, anchor, hol, years = 10) {
    const end = addMonths(anchor, 12 * years), out = [];
    const add = (nominal, label) => out.push({ date: nextWorking(nominal, hol), nominal, label });
    if (mod === 'CPR') for (let k = 0; addMonths(anchor, 3 * k) <= end; k++) add(addMonths(anchor, 3 * k), 'CPR');
    if (mod === 'BLS') for (let k = 0; addMonths(anchor, 24 * k) <= end; k++) add(addMonths(anchor, 24 * k), 'BLS');
    if (mod === 'MED') for (let k = 0; addMonths(anchor, 12 * k) <= end; k++) add(addMonths(anchor, 12 * k), 'Medical');
    if (mod === 'HEP') { add(anchor, 'HEP B STAT'); add(addDays(anchor, 30), 'HEP B +30 days'); add(addMonths(anchor, 6), 'HEP B +6 months'); }
    return out;
  }
  // CPR and BLS may not share a day for one person. HEP B overlaps are allowed.
  const clash = (a, b) => a.date === b.date && ((a.mod === 'CPR' && b.mod === 'BLS') || (a.mod === 'BLS' && b.mod === 'CPR'));
  root.Core = { iso, parse, addDays, addMonths, nextWorking, prevWorking, reminderDay, generate, clash, isWeekend };
  if (typeof module !== 'undefined') module.exports = root.Core;
})(typeof window !== 'undefined' ? window : globalThis);
