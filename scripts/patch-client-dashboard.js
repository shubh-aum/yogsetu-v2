// One-off patch: the client's "Post a requirement" wizard collects everything the
// public job page now shows (level, weekly days, checklist) and sends the area as a
// locality instead of (wrongly) as timing.
const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'public', 'client-dashboard.html');
let s = fs.readFileSync(file, 'utf8');
const rep = (anchor, replacement, all) => {
  const n = s.split(anchor).length - 1;
  if (n < 1 || (!all && n !== 1)) throw new Error(`anchor count ${n}: ${anchor.slice(0, 70)}`);
  s = all ? s.split(anchor).join(replacement) : s.replace(anchor, () => replacement);
};

rep('<input type="text" id="rq-title" placeholder="e.g. Hatha yoga teacher for morning sessions" required></div>',
  `<input type="text" id="rq-title" placeholder="e.g. Hatha yoga teacher for morning sessions" required></div>
        <div class="field"><label>Your level</label>
          <select id="rq-level">
            <option value="any">Any / not sure</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>`);

rep('<div class="field"><label>Additional scheduling notes (optional)</label><input type="text" id="rq-timing-notes" placeholder="e.g. 3x per week, flexible on weekends"></div>',
  `<div class="field"><label>Additional scheduling notes (optional)</label><input type="text" id="rq-timing-notes" placeholder="e.g. Mornings, 3x per week" maxlength="200"></div>
        <div class="field">
          <label>Days you need sessions (optional)</label>
          <div class="checkbox-grid" id="rqDays">
            <label class="checkbox-chip"><input type="checkbox" data-day="1">Mon</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="2">Tue</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="3">Wed</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="4">Thu</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="5">Fri</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="6">Sat</label>
            <label class="checkbox-chip"><input type="checkbox" data-day="7">Sun</label>
          </div>
        </div>
        <div class="field"><label>Usual start time on those days</label>
          <select id="rq-day-time">
            <option>5:30 AM</option><option>6:00 AM</option><option>6:30 AM</option><option selected>7:00 AM</option><option>8:00 AM</option><option>9:00 AM</option>
            <option>10:00 AM</option><option>12:00 PM</option><option>3:00 PM</option><option>5:00 PM</option><option>6:00 PM</option><option>7:00 PM</option><option>8:00 PM</option>
          </select>
        </div>`);

rep('<textarea id="rq-details" placeholder="Experience level, group size, what a good fit looks like&hellip;"></textarea></div>',
  `<textarea id="rq-details" placeholder="Group size, what a good fit looks like&hellip;"></textarea></div>
        <div class="field"><label>What are you looking for? (one point per line, optional)</label><textarea id="rq-needs" rows="4" placeholder="Patient teaching style for a beginner&#10;Experience with senior-friendly modifications"></textarea></div>`);

// slot chips only (the day chips have data-day)
rep("form.querySelectorAll('.checkbox-grid input:checked')", "form.querySelectorAll('.checkbox-grid input:checked:not([data-day])')", true);

rep("            timing: val('rq-location'),\n",
  `            locality: val('rq-location'),
            schedule: val('rq-timing-notes'),
            level: val('rq-level'),
            needs: val('rq-needs'),
            schedule_days: Array.from(form.querySelectorAll('#rqDays input:checked')).map(function(c){ return { day: Number(c.getAttribute('data-day')), time: val('rq-day-time') }; }),
`);

fs.writeFileSync(file, s);
console.log('client-dashboard.html patched');
