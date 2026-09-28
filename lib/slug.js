// URL slug helpers. Slugs are lowercase ASCII, hyphen separated, and stable:
// once a teacher / job / place has a slug it is stored in the DB and reused so
// links (and search-engine rankings) survive later renames.

function slugify(text, max = 80) {
  const s = String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')       // strip accents
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
    .replace(/-+$/g, '');
  return s;
}

// Picks a slug from `base` that is not in `taken` (a Set or a predicate),
// appending -2, -3 ... when needed.
function uniqueSlug(base, taken) {
  const isTaken = typeof taken === 'function' ? taken : (s) => taken.has(s);
  const root = slugify(base) || 'item';
  if (!isTaken(root)) return root;
  for (let i = 2; i < 1000; i += 1) {
    const candidate = `${root}-${i}`;
    if (!isTaken(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

module.exports = { slugify, uniqueSlug };
