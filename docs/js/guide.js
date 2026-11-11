/* Search is progressive enhancement; the complete guide is pre-rendered HTML. */
(() => {
  'use strict';
  const search = document.getElementById('feature-search');
  const category = document.getElementById('feature-category');
  if (!search || !category) return;

  const sections = [...document.querySelectorAll('.feature-category')];
  const features = [...document.querySelectorAll('.feature')];
  const text = new Map(features.map(feature => [feature, feature.textContent.toLocaleLowerCase()]));
  const result = document.getElementById('feature-results');
  const noResults = document.getElementById('no-results');
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if ([...category.options].some(option => option.value === params.get('category'))) {
    category.value = params.get('category');
  }

  function filter(updateURL = true) {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const section of sections) {
      let count = 0;
      const selected = !category.value || category.value === section.dataset.category;
      for (const feature of section.querySelectorAll('.feature')) {
        const matches = selected && terms.every(term => text.get(feature).includes(term));
        feature.hidden = !matches;
        if (matches) count++;
      }
      section.hidden = count === 0;
      visible += count;
    }
    result.textContent = `${visible} of ${features.length} features shown`;
    noResults.hidden = visible !== 0;
    if (updateURL && location.protocol !== 'file:') {
      const url = new URL(location.href);
      if (search.value.trim()) url.searchParams.set('q', search.value.trim());
      else url.searchParams.delete('q');
      if (category.value) url.searchParams.set('category', category.value);
      else url.searchParams.delete('category');
      try { history.replaceState(null, '', url); } catch { /* File/sandbox previews still filter. */ }
    }
  }

  function revealAnchor() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target?.classList.contains('feature')) return;
    // Direct links must work even when a previously shared filter hides this entry.
    if (target.hidden) {
      search.value = '';
      category.value = '';
      filter();
    }
    const details = target.querySelector('details');
    if (details) details.open = true;
    target.scrollIntoView({ block: 'start' });
  }
  search.addEventListener('input', () => filter());
  category.addEventListener('change', () => filter());
  document.getElementById('search-reset').addEventListener('click', () => {
    search.value = '';
    category.value = '';
    filter();
    search.focus();
  });
  window.addEventListener('hashchange', revealAnchor);
  filter(false);
  revealAnchor();
})();
