/* The complete history is pre-rendered; filtering also works in an offline preview. */
(() => {
  'use strict';
  const channel = document.getElementById('changelog-channel');
  const search = document.getElementById('changelog-search');
  const clear = document.getElementById('changelog-clear');
  const count = document.getElementById('changelog-count');
  const empty = document.getElementById('changelog-no-results');
  const entries = [...document.querySelectorAll('.changelog-entry')];
  const kind = document.getElementById('changelog-list')?.dataset.kind || 'versions';
  if (!channel || !search || !clear || !count || !empty) return;
  const params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if ([...channel.options].some(option => option.value === params.get('channel'))) {
    channel.value = params.get('channel');
  }

  function apply(updateURL = true) {
    const terms = search.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const entry of entries) {
      const matches = (!channel.value || entry.dataset.channel === channel.value)
        && terms.every(term => entry.dataset.search.includes(term));
      entry.hidden = !matches;
      if (matches) visible++;
    }
    count.textContent = `${visible} of ${entries.length} ${kind} shown`;
    empty.hidden = visible !== 0;
    if (updateURL && location.protocol !== 'file:') {
      const url = new URL(location.href);
      if (search.value.trim()) url.searchParams.set('q', search.value.trim());
      else url.searchParams.delete('q');
      if (channel.value) url.searchParams.set('channel', channel.value);
      else url.searchParams.delete('channel');
      try { history.replaceState(null, '', url); } catch { /* Filtering still works in previews. */ }
    }
  }

  function revealAnchor() {
    let target;
    try { target = document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return; }
    if (!target?.classList.contains('changelog-entry')) return;
    if (target.hidden) {
      search.value = '';
      channel.value = '';
      apply();
    }
    target.scrollIntoView({ block: 'start' });
  }

  channel.addEventListener('change', () => apply());
  search.addEventListener('input', () => apply());
  window.addEventListener('hashchange', revealAnchor);
  clear.addEventListener('click', () => {
    channel.value = '';
    search.value = '';
    apply();
    search.focus();
  });
  apply(false);
  revealAnchor();
})();
