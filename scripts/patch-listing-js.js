// One-off patch: the city filter on /yoga-teachers and /yoga-jobs navigates to
// the SEO-friendly city URL instead of filtering client-side.
const fs = require('fs');
const path = require('path');

function patch(file) {
  const full = path.join(__dirname, '..', 'public', 'assets', 'js', file);
  let s = fs.readFileSync(full, 'utf8');
  const rep = (a, b) => { if (!s.includes(a)) throw new Error(`${file}: missing ${a.slice(0, 60)}`); s = s.replace(a, b); };

  rep('  var heroCity = document.getElementById("heroCity");',
`  var heroCity = document.getElementById("heroCity");

  // City choices are real, indexable pages (/yoga-teachers/lucknow ...): picking
  // one navigates there; the list you land on is already filtered server-side.
  function cityUrlOf(select) {
    var o = select && select.options[select.selectedIndex];
    return o ? o.getAttribute("data-url") : null;
  }
  var ALL_URL = citySelect && citySelect.options[0] ? citySelect.options[0].getAttribute("data-url") : null;
  function goAll() { if (ALL_URL) window.location.href = ALL_URL; }`);

  rep('clear: function () { citySelect.value = "All cities"; }', 'clear: function () { goAll(); }');
  rep('    if (citySelect) citySelect.value = "All cities";', '    if (citySelect && citySelect.value && ALL_URL) { window.location.href = ALL_URL; return; }');

  rep('      if (citySelect && heroCity && heroCity.value) citySelect.value = heroCity.value;',
`      if (heroCity && heroCity.value && (!citySelect || heroCity.value !== citySelect.value)) {
        var heroUrl = cityUrlOf(heroCity);
        if (heroUrl) {
          window.location.href = heroUrl + (heroMode && heroMode.value ? "?mode=" + encodeURIComponent(heroMode.value) : "");
          return;
        }
      }`);

  // navigate on city change (kept next to the existing change wiring)
  const marker = /\n  if \(clearBtn\) clearBtn\.addEventListener\("click", clearAllFilters\);/;
  if (!marker.test(s)) throw new Error(`${file}: clearBtn marker`);
  s = s.replace(marker, `\n  if (citySelect) citySelect.addEventListener("change", function () { var u = cityUrlOf(citySelect); if (u) window.location.href = u; });\n  if (clearBtn) clearBtn.addEventListener("click", clearAllFilters);`);

  // ?mode=online|offline arrives from the hero search on another page
  rep('  // Initial render\n  applyFilters();',
`  // Initial render
  var presetMode = new URLSearchParams(window.location.search).get("mode");
  if (presetMode) modeChecks.forEach(function (c) { c.checked = c.value === presetMode; });
  applyFilters();`);

  fs.writeFileSync(full, s);
  console.log('patched', file);
}

['teachers.js', 'requirements.js'].forEach(patch);
