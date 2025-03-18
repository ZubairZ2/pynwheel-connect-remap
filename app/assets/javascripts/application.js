// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, vendor/assets/javascripts,
// or any plugin's vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery.min
//= require jquery-ui.min
//= require jquery_ujs
//= require intlTelInput
//= require bootstrap.min
//= require best_in_place
//= require best_in_place.jquery-ui
//= require dataTables/jquery.dataTables
//= require dataTables/bootstrap/3/jquery.dataTables.bootstrap
// require turbolinks
//= require common_functions
//= require_tree ./services
//= require amenity
//= require tour_stop_plotting
//= require door-plotting
//= require access-point-plotting
//= require pyn.min
//= require jquery.validationEngine-en
//= require jquery.validationEngine
//= require populate_geocode
//= require custom
//= require cable
//= require design
//= require home_page
//= require favorite
//= require bootstrap-colorpicker.min
//= require jcrop
//= require jquery-ui/widgets/sortable
//= require rails_sortable
//= require maps
//= require unit-plotting
//= require sitemap
//= require tour
//= require communities
//= require regions
//= require floorplate
//= require chosen.jquery.min
//= require ekko-lightbox
//= require jquery.remotipart
//= require jquery.mCustomScrollbar.concat.min
//= require webpages
//= require clipboard.min
//= require favorites
//= require bootstrap-tagsinput
//= require panzoom
//= require tinymce
//= require dropzone
//= require bootstrap-select
//= require jquery.multi-select 
//= require tags
//= require multiple_tabs
//= require easy-loading
//= require jquery.mousewheel.min
//= require jquery.line
//= require zoom-marker.min
//= require pinch-zoom.umd
//= require jquery.ui.touch-punch.min
//= require accesses
//= require pynwheel_access_users
//= require Chart.min
//= require analytics
//made changes in jquery.multi-select according to our requirement in at library at line #488. Commented sanitize function
// require_tree .
//= require bootstrap-wysihtml5
//= require bootstrap-wysihtml5/locales
//= require automate_plotting


$(document).ready(function(){
  new Clipboard('.clipboard-btn');
});

function formatDate(date, format) {
  if(date == "Now" || !date) return date;

  date = (date instanceof Date) ? date : new Date(date)
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);

  return format.replace("dd", day).replace("mm", month).replace("yy", year);
}

function formattedDateByRegion(country_code, date) {
  switch (country_code) {
    case "US":
      return formatDate(date, 'mm/dd/yy');
    case "GB":
      return formatDate(date, 'dd/mm/yy');
    case "CA":
      return formatDate(date, 'dd/mm/yy');
    default:
      return formatDate(date, 'mm/dd/yy');
  }
}