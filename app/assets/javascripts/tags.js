$(document).ready(function(){
    $(".tag-check").keydown(function (event) {
        if(event.which == 46)
          return false
        var tb = $(this).get(0);
        var start = tb.selectionStart;
        var end = tb.selectionEnd;
        var reg = new RegExp("(<.+?>)", "g");
        var amatch = null;
        amatch = reg.exec(tb.value)
        console.log(event.which)
        if (event.which != 37 && event.which != 39){
          while (amatch != null) {
              var thisMatchStart = amatch.index-1;
              var thisMatchEnd = amatch.index + amatch[0].length+1;
              if (start <= thisMatchStart && end > thisMatchStart) {
                  event.preventDefault();
                  return false;
              }
              else if (start > thisMatchStart && start < thisMatchEnd) {
                  event.preventDefault();
                  return false;
              }
          }
        }
        
    });

})
