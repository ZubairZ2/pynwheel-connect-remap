// app/views/widgets/widget.js
var MyWidgetJS = {
  getScript: function(url, success) {
    var done, head, script;
    script = document.createElement('script');
    script.src = url;
    head = document.getElementsByTagName('head')[0];
    done = false;
    script.onload = script.onreadystatechange = function() {
      if (!done && (!this.readyState || this.readyState === 'loaded' || this.readyState === 'complete')) {
        done = true;
        success();
        script.onload = script.onreadystatechange = null;
        return head.removeChild(script);
      }
    };
    return head.appendChild(script);
  },
  load: function() {
    var $elem, $iframe;
    $elem = $('#my-widget');
    var url = "http://localhost:3000/schedular_widget/widget";
    if ($elem.length > 0) {
      $elem.empty();
      $iframe = $('<iframe>').attr('src',  url)
                             .attr('frameborder', '0')
                             .attr('id', 'widget-iframe')
                             .attr('allowtransparency', 'true');
      return $elem.append($iframe);
    }
  },
};
if (typeof jQuery === 'undefined') {
  MyWidgetJS.getScript('//ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js', function() {
    return MyWidgetJS.load();
  });
} else {
  MyWidgetJS.load();
}