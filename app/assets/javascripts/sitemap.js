var imageOCRResponse = [];
var ocrImageDimensions;

$(document).ready(function () { 
  if ($('.is-sitemap')[0]) {
    selected = [];
    var temp = [];
    dx = 0;
    dy = 0;
    $("#map").css('cursor', 'default');
    imageOCRResponse = $("#ocrData").data("ocrData");
    ocrImageDimensions = $("#ocrData").data("imageDimensions");

    doDraggable();

    // $('.amenities-list').on('change', function(e) {
    //   e.preventDefault();
    //   console.log($(this).val());
    //   $('.amenities-list :selected').each(function(){
    //     if ($(this).val()!=""){
    //       console.log('selecting dropdown values from sitemap');
    //       console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1); 
    //       if (selected.length == 0){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //       else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //     }
    //     // add to selected list
    //     $("#selected-units").empty();
    //     for (i=0; i<selected.length; i++) {
    //       $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
    //     }
    //     $('#newmsg').hide();

    //     // hide from unused list
    //     $(this).css({"display": "none"});
    //     plotMode();
    //   }); 
    // });

    $('.amenities-list').multiSelect();
    $('.amenities-list-on-popup').multiSelect();

    $('.select-units-on-page .ms-elem-selectable').click(function () {
      console.log("We are extracting -selectable from unit_provider_id");
      var unit_provider_id = $(this).attr('id');
      unit_provider_id = unit_provider_id.replace("-selectable", "")
      console.log(unit_provider_id);
      selected.push([unit_provider_id, $(this).children('span').text()]);

      if(imageOCRResponse.length > 0)
        displayHints();

      plotMode();
    });

    $('.unit-selects-in-popup .ms-elem-selectable').click(function () {
      console.log('selecting in popup');
      var unit_provider_id = $(this).attr('id');
      unit_provider_id = unit_provider_id.replace("-selectable", "")
      var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
      unit_providers_array.push(unit_provider_id);
      $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
      console.log($('#unit_provider_ids').val());
    });

    $('.unit-selects-in-popup .ms-elem-selection').click(function () {
      console.log('De selecting in popup');
      var unit_providers_array = JSON.parse($('#unit_provider_ids').val());
      unit_providers_array.splice($.inArray($(this).attr('id').split('-')[0], unit_providers_array), 1);
      $('#unit_provider_ids').val(JSON.stringify(unit_providers_array));
      console.log(unit_providers_array);
    });

    $('.select-units-on-page .ms-elem-selection').click(function () {
      console.log($(this).attr('id'));
      s_id  = $(this).attr('id').replace("-selection","");
      // s_id = s_id[0] + "-" + s_id[1];
     
      removeUnitFromSelectedArray(s_id);
    });


    // $(document).on("click", ".marker" , function() {
    //   console.log($(this).attr("title"));
    //   $(this).attr('data-name' , 'plot');
    //   $(this).attr('data-target' , '#confirm-delete');
    //   $(this).attr('data-toggle' , 'modal');
    //   $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot');
    // });

    // $("#map").mouseup(function (e) {
    //   // first check if user is clicking on scrollbar
    //   if (e.target != $('#map').get(0)) {
    //     e.preventDefault();
    //     left_margin = parseInt($('#left_margin').html());
    //     right_margin = parseInt($('#right_margin').html());

    //     dx = parseInt($('#active_x_plot').html()) - 8;
    //     dy = parseInt($('#active_y_plot').html() - 10);
    //     // dx = dx - left_margin;
    //     // dy = dy -right_margin;
    //     fontSize = $('#font_size').html();
    //     marker_color = $('#marker_color').html();
    //     if (addmode) {
    //       // save plotting for each selected unit
    //       for (i = 0; i < selected.length; i++) {
    //         savePlot(selected[i][0], dx, dy);
    //       }
    //       // add new marker to display
    //       tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + (dx - left_margin) + "px; top:" + (dy - right_margin) + "px; position:absolute; font-size: "+ fontSize+"px;'>";

    //       tag += "<i class='fas fa-map-marker-alt' style='color: "+marker_color+";'></i>";
    //       tag += "</a>"
    //       $('#map').append(tag);
    //       // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
    //       //$(".marker:last").trigger("click") 
    //       reset();
    //       doDraggable();
    //     }
    //   }
    // });
  }
});

function displayHints() {
  console.log(imageOCRResponse);
  if(imageOCRResponse.length > 0 ) {
    let  html = "";

    selected.forEach(selected_units => {
      $(".fa-circle-thin").remove(".hint-unit-blink");
      imageOCRResponse.forEach(ocr_u => {
        if(ocr_u.text && ocr_u.text.length > 2) {
          if(textFilter(selected_units[1], ocr_u.text)) {
            console.log(selected_units[1])
            console.log(ocr_u)
            console.log("Left :   ", ocrImageDimensions.width * ocr_u.left)
            console.log("Top  :   ", ocrImageDimensions.height * ocr_u.top)

            let unit_left = (ocrImageDimensions.width * ocr_u.left) + 10;
            let unit_top = (ocrImageDimensions.height * ocr_u.top);
            let circleTag = `suggested-circle-${selected_units[0]}`;
            console.log("Suggested unit", selected_units)
            html += `<i class="fa fa-circle-thin hint-unit-blink ${circleTag}" style="color: #d37474; left:${unit_left}px; top:${unit_top}px; position:absolute; transform: scale(3);"></i>`
          }
        }
      });
    });

    $('#map').append(html);
  }
}

function textFilter(selectedUnit, ocrDetectedUnit) {
  u_parts = ocrDetectedUnit.split("-");
  let u_flag = false
  u_parts.forEach((u_text) =>{
    if(selectedUnit && u_text && selectedUnit.includes(u_text)) {
      u_flag = true
    }
  });

  return u_flag;
}

function saveSiteMapImage() {
  const siteMapImageDropzone = new Dropzone("#sitemap-image-upload-holder", {url: "/communities/" + community_id + "/sitemaps/" + sitemap_id + "/save_sitemap_image"});
  Dropzone.options.siteMapImageDropzone = {
    uploadMultiple: true
  };

  siteMapImageDropzone.on("complete", function (file) {
    location.reload();
  });

  siteMapImageDropzone.on("addedfile", function (file) {
    $(".divLoading").removeClass("hidden");
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      $(".divLoading").addClass("hidden");
      $('#image-upload-warning').modal('show');
      siteMapImageDropzone.removeFile(file);
    }
  });
}

function saveSiteMapSVG() {
  const siteMapSVGDropzone = new Dropzone("#sitemap-svg-upload-holder", {url: "/communities/" + community_id + "/sitemaps/" + sitemap_id + "/save_sitemap_image"});
  Dropzone.options.siteMapSVGDropzone = {
    uploadMultiple: true
  };

  siteMapSVGDropzone.on("complete", function (file) {
    location.reload();
  });

  siteMapSVGDropzone.on("addedfile", function (file) {
    $(".divLoading").removeClass("hidden");
    if (file.type != "image/svg+xml") {
      $(".divLoading").addClass("hidden");
      $('#svg-upload-warning').modal('show');
      siteMapSVGDropzone.removeFile(file);
    }
  });
}

function addMarker(){
  $('#add-marker-heading').html('Add marker at x:'+$('#horizontal_position').val()+' y:'+ $('#vertical_position').val());
  $('#add_horizontal_position').val($('#horizontal_position').val());
  $('#add_vertical_position').val($('#vertical_position').val());
  $('#add-marker-modal').modal('show');
}

function start_access_point_plot(event){
    accesspointplot = true
    selected = [null]
    plotMode()

    $(".multi-select-units").css({"pointer-events": "none"})
    $("#map").css('cursor', 'crosshair')
    $("<div id='overlay'></div>").css({
      position: "absolute",
      width: "100%",
      height: "100%",
      top: 0,
      left: 0,
      background: "#000000",
      opacity: 0.5
    }).appendTo($(".multi-select-units").css("position", "relative"));
}