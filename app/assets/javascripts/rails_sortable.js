(function($) {

  $.fn.railsSortable = function(options) {
    var defaults = {
      
      
    };

    var setting = $.extend(defaults, options);
    setting["update"] = function() {
      $.post("/sortable/reorder", $(this).sortable('serialize'))
    }

    this.sortable(setting);
  };

})(jQuery);