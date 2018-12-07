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
//= require bootstrap.min
//= require best_in_place
//= require best_in_place.jquery-ui
//= require dataTables/jquery.dataTables
//= require dataTables/bootstrap/3/jquery.dataTables.bootstrap
// require turbolinks
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
//= require floorplate
//= require amenity
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
//made changes in jquery.multi-select according to our requirement in at library at line #488. Commented sanitize function
// require_tree .
//= require bootstrap-wysihtml5
//= require bootstrap-wysihtml5/locales
$(document).ready(function(){
	new Clipboard('.clipboard-btn');
});