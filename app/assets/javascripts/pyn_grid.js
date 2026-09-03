// Toolbar behaviour shared by the CMS's server-side filtered grids.
//
// Filtering, sorting and paging are all the same operation as far as the
// browser is concerned: re-request this page with a different query string and
// swap in the results fragment the server sends back. Keeping that in one place
// is what lets a grid keep state the swap would otherwise destroy - the units
// grid carries a selection across pages this way.
//
// A page supplies its own element ids and, optionally, hooks:
//
//   PynGrid.init({
//     form:    "#property-filters",   // the toolbar <form>; its action is the endpoint
//     results: "#property-results",   // the element the fragment replaces
//     spinner: "#filter-spin",
//     clear:   "#clear-filters",
//     onBeforeFetch: function (query) {},  // a filter change redefines the set
//     onRender: function () {}             // re-bind anything bound per row
//   });
//
// The returned handle exposes `query()` and `refresh()` for pages that need to
// read or force the current request.
window.PynGrid = (function () {
  "use strict";

  var DEBOUNCE_MS = 260;

  function init(options) {
    var form = document.querySelector(options.form);
    var results = document.querySelector(options.results);
    if (!form || !results) return null;

    var spinner = options.spinner ? document.querySelector(options.spinner) : null;
    var clear = options.clear ? document.querySelector(options.clear) : null;
    var onRender = options.onRender || function () {};
    var onBeforeFetch = options.onBeforeFetch || function () {};

    var timer = null;
    var inFlight = null;
    var lastQuery = window.location.search;

    // Blank controls are dropped rather than sent as empty values, so the URL
    // stays readable and "no filters" is genuinely no query string.
    function currentQuery() {
      var params = new URLSearchParams(new FormData(form));
      Array.prototype.slice.call(params.keys()).forEach(function (key) {
        if (!params.get(key)) params.delete(key);
      });
      var qs = params.toString();
      return qs ? "?" + qs : "";
    }

    function fetchResults(query) {
      if (inFlight) inFlight.abort();
      inFlight = new AbortController();
      if (spinner) spinner.classList.add("on");

      return fetch(form.action + query, {
        signal: inFlight.signal,
        headers: { "X-Requested-With": "XMLHttpRequest" }
      })
        .then(function (res) { return res.text(); })
        .then(function (html) {
          results.innerHTML = html;
          onRender();
          history.replaceState(null, "", query || window.location.pathname);
          lastQuery = query;
        })
        // A failed swap falls back to a full navigation rather than leaving
        // stale rows under a toolbar that no longer describes them.
        .catch(function (e) { if (e.name !== "AbortError") window.location.search = query; })
        .finally(function () {
          if (spinner) spinner.classList.remove("on");
          inFlight = null;
        });
    }

    function applyFilters() {
      var query = currentQuery();
      if (query === lastQuery) return;
      onBeforeFetch(query);
      fetchResults(query);
      syncClear();
    }

    function syncClear() {
      if (clear) clear.style.display = currentQuery() ? "" : "none";
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); applyFilters(); });
    // Typing is debounced; picking from a select is not - that is a finished
    // decision and waiting on it just feels broken.
    form.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(applyFilters, DEBOUNCE_MS);
    });
    form.addEventListener("change", function () { clearTimeout(timer); applyFilters(); });

    if (clear) {
      clear.addEventListener("click", function (e) {
        e.preventDefault();
        form.querySelectorAll("input[type=text], input[type=number]").forEach(function (i) { i.value = ""; });
        form.querySelectorAll("select").forEach(function (s) { s.value = ""; });
        applyFilters();
      });
    }

    // Sort headers, pager links and the rows-per-page control are ordinary
    // links; intercepting them keeps paging on the same path as filtering,
    // which is what lets page-spanning state survive.
    results.addEventListener("click", function (e) {
      var link = e.target.closest("a[data-remote-nav], .pagination a");
      if (!link || link.classList.contains("disabled")) return;
      e.preventDefault();
      fetchResults(link.getAttribute("href").replace(/^[^?]*/, ""));
    });

    syncClear();
    onRender();

    return {
      query: currentQuery,
      refresh: function () { return fetchResults(currentQuery()); }
    };
  }

  return { init: init };
})();
