
function delayedEvents(callback) {
  const interval = setInterval(() => {
    if (typeof require === "function") {
      clearInterval(interval);
      callback();
    }
  }, 100);
}

// then
delayedEvents(() => {
  /* Requiring Esri Geometry Point */
  require(["esri/geometry/Point"], function (Point) {
    window.__esri = window.__esri || {};
    window.__esri.geometry = { Point };
    console.log("✅ ArcGIS Point loaded");
  });
});
