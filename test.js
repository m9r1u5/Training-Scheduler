const C = require('./core.js'), assert = require('assert');
const hol = ['2026-12-25','2026-12-26','2027-01-01'];
const d = (m,a,h=hol)=>C.generate(m,a,h).map(e=>e.date+' '+e.label);
// weekend shift: Sat 2026-10-10 -> Mon 12
assert.strictEqual(C.nextWorking('2026-10-10',hol),'2026-10-12');
// holiday + weekend chain: Fri 25 Dec holiday, Sat, Sun -> Mon 28 Dec
assert.strictEqual(C.nextWorking('2026-12-25',hol),'2026-12-28');
// month clamp
assert.strictEqual(C.addMonths('2026-08-31',6),'2027-02-28');
assert.strictEqual(C.addMonths('2027-11-30',3),'2028-02-29');
// HEP B from Wed 7 Oct 2026: +30d = Fri 6 Nov, +6m = Wed 7 Apr 2027
console.log(d('HEP','2026-10-07'));
assert.deepStrictEqual(d('HEP','2026-10-07'),['2026-10-07 HEP B STAT','2026-11-06 HEP B +30 days','2027-04-07 HEP B +6 months']);
// HEP B where +30d is Sat: STAT Mon 12 Oct -> 11 Nov Wed ok; STAT Thu 1 Oct -> 31 Oct Sat -> Mon 2 Nov
assert.strictEqual(d('HEP','2026-10-01')[1],'2026-11-02 HEP B +30 days');
// CPR quarterly, 5 events inclusive of +12m; Dec 25 holiday shifts to 28
assert.strictEqual(d('CPR','2026-10-07').length,41);
assert.strictEqual(d('MED','2026-10-07').length,11);
assert.strictEqual(d('BLS','2026-10-07').length,6);
assert.strictEqual(d('HEP','2026-10-07').length,3);
assert(d('CPR','2026-10-07').pop().startsWith('2036-10-07'));
assert.strictEqual(d('CPR','2026-09-25')[1],'2026-12-28 CPR');
console.log(d('BLS','2026-10-07'),d('MED','2026-10-07'));
// reminders: Monday event -> Friday; Tue after Monday holiday -> previous working day
assert.strictEqual(C.reminderDay('2026-10-12',hol),'2026-10-09');
assert.strictEqual(C.reminderDay('2026-12-28',hol),'2026-12-24'); // 25 hol,26-27 off
assert.strictEqual(C.reminderDay('2027-01-04',hol),'2026-12-31'); // 1 Jan hol, weekend
assert(C.clash({date:'a',mod:'CPR'},{date:'a',mod:'BLS'}));
assert(!C.clash({date:'a',mod:'CPR'},{date:'a',mod:'HEP'}));
console.log('ALL OK');
