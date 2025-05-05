var mouseTracker

function bindTrackers () {
  /* To get the current mouse Position in the screen */
  mouseTracker = new MouseTracker();

  /* Exposiing Argis geometry point */
  require(["esri/geometry/Point"], function(Point) {
    window.__esri = window.__esri || {};
    window.__esri.geometry = { Point };
  });
  
}

bindTrackers();
