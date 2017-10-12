/* Author: Greg Ryan, Pynwheel, Inc.
   Editor: Alexey Klimuk, Softensity, Inc.
 * sitemap, floorplate, amenity map plotting
*/
  $(window).on('load',function (){
    /**
    * map controls
    */
    var xpos;
    var ypos;
    var xmove = 0;
    var ymove = 0;
    var xlast = -1;
    var ylast = -1;
    var addmode = false;

    // get thumb scale and set it's height
    map_scale = $('#map').width() / $('#map-thumb').width();
    $('#map-thumb').height( $('#map').height() / map_scale );
    $('#plate-thumb').height( $('#map').height() / map_scale );
    $('#site-thumb').height( $('#map').height() / map_scale );

    // show mousemove x/y
    $('#map').mousemove(function(event) {
      var dx = parseInt(event.pageX) - parseInt($('#map').offset().left) + parseInt($('#map').scrollLeft());
      var dy = parseInt(event.pageY) - parseInt($('#map').offset().top) + parseInt($('#map').scrollTop());
      $('#active_x_plot').html(dx);
      $('#active_y_plot').html(dy);
    });

    // place maker on click
    $("#map").click(function(event) {
      $(this).css('cursor','default');
      event.preventDefault();
      var dx = parseInt($('#active_x_plot').html())-8;
      var dy = parseInt($('#active_y_plot').html()-10);
      $('#new-aj-popup #x_plot').val(dx);
      $('#new-aj-popup #y_plot').val(dy);
      if (addmode) {
        //$('#map-marker').css({left: (dx-8)+"px", top: (dy-10)+"px", display: "block"});
        $('#map-marker').css({left: (dx)+"px", top: (dy)+"px", display: "block"});
        $("#new-aj-popup").show();
      }
    });

    // show/hide map-thumb
    $('#showhide').click( function(e) {
      $('#map-thumb').toggle();
    });

    // close amenityjoin popup
    $('.close-aj-popup').click(function(e){
        e.preventDefault();
        $(".aj-popup").hide();
        $('#map-marker').css({left: "0", top: "0", display: "none"});
        addmode = false;
        $("#newmsg").css({display: 'none'});
    });

    // new marker button click
    $("#new").click(function(e) {
      addmode = true;
      $("#newmsg").css({display: 'inline-block'});
      e.preventDefault();
    });

    // map thumbnail scroller
    $('#map-nav').draggable({
      containment: 'parent',
      stack: "#map-nav",
      // get the initial X and Y position when dragging starts
      start: function(event, ui) {
        xpos = ui.position.left;
        ypos = ui.position.top;
        // init hold values for thumb placement
        if (xlast == -1) {
          xlast=$('#map-container').scrollLeft();
          ylast=$('#map-container').scrollTop();
        }
        $('#map-container').scrollLeft(xlast);
        $('#map-container').scrollTop(ylast);
      },
      // when dragging stops
      drag: function(event, ui) {
        // calculate the dragged distance, with the current X and Y position and the "xpos" and "ypos"
        xmove = ui.position.left - xpos;
        ymove = ui.position.top - ypos;
        $('#map-container').scrollLeft(xlast+xmove * map_scale);
        $('#map-container').scrollTop(ylast+ymove * map_scale);
      },
      stop: function(event, ui) {
        xlast=$('#map-container').scrollLeft();
        ylast=$('#map-container').scrollTop();
      }
    });

    // set @currunit x/y on load
    if ($('#x_plot').val() != "") {
      $('#container').scrollLeft($('#x_plot').val() - ($('#container').width()/2));
      $('#container').scrollTop($('#y_plot').val() - ($('#container').height()/2));
      var dx = parseInt($('#x_plot').val());
      var dy = parseInt($('#y_plot').val());
      // place marker
      $('#map-marker').css({left: (dx)+"px", top: (dy)+"px", display: 'none'});
    }

    /**
    * misc
    */
    addmode = (window.isamenity === undefined ? false : true) ;
  });



