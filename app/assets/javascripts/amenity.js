$(document).ready(function () {
  if ($('.is-amenity')[0]) {
    selected = [];
    $("#map, #svg_map").css('cursor', 'default');

    doDraggable();
  }
});
