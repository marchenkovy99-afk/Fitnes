import test from 'node:test';
import assert from 'node:assert/strict';
const c=await import('../calendar.js').catch(()=>({}));
test('calendar uses Monday-first weeks and includes leap day',()=>{
  assert.equal(typeof c.monthGrid,'function');
  const days=c.monthGrid(2024,1);
  assert.equal(days.length,42);assert.equal(days[0].date,'2024-01-29');
  assert.equal(days.filter(x=>x.inMonth).length,29);
  assert.ok(days.some(x=>x.date==='2024-02-29'));
});
test('December calendar continues into January with valid year boundaries',()=>{
  const days=c.monthGrid(2026,11);
  assert.equal(days[0].date,'2026-11-30');
  assert.ok(days.some(x=>x.date==='2027-01-01'&&!x.inMonth));
});
