$(document).ready(function(){
  if ($('.is-sitemap')[0]){
      selected=[];
      var temp=[];
      dx = 0;
      dy = 0;
      $("#map").css('cursor','default');

      doDraggable();

      $('.amenities-list').on('change', function(e) {
        e.preventDefault();
        console.log($(this).val());
        $('.amenities-list :selected').each(function(){
          if ($(this).val()!=""){
            console.log('selecting dropdown values from sitemap');
            console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1); 
            if (selected.length == 0){
              selected.push([ $(this).val(), $.trim($(this).text()) ]);
            }
            else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
              selected.push([ $(this).val(), $.trim($(this).text()) ]);
            }
          }
          // add to selected list
          $("#selected-units").empty();
          for (i=0; i<selected.length; i++) {
            $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
          }
          $('#newmsg').hide();

          // hide from unused list
          $(this).css({"display": "none"});
          plotMode();
        }); 
      });

     
      // $(document).on("click", ".marker" , function() {
      //   console.log($(this).attr("title"));
      //   $(this).attr('data-name' , 'plot');
      //   $(this).attr('data-target' , '#confirm-delete');
      //   $(this).attr('data-toggle' , 'modal');
      //   $(this).attr('data-href' , '/communities/'+community_id+'/units/'+$(this).attr("title")+'/remove_plot');
      // });

      $("#map").mouseup(function(e) {
        // first check if user is clicking on scrollbar
        if (e.target != $('#map').get(0)){
          e.preventDefault();
          dx = parseInt($('#active_x_plot').html())-8;
          dy = parseInt($('#active_y_plot').html()-10);
          if (addmode) {
            // save plotting for each selected unit
            for (i=0; i<selected.length; i++) {
              savePlot(selected[i][0], dx, dy);
            }
            // add new marker to display
            tag = "<a class='marker' data-toggle='tooltip' title='" + selected[0][1] + "' style='left:" + dx + "px; top:" + dy +"px; position:absolute;'>";
            
            tag += "<i class='fa fa-asterisk'></i>";
            tag += "</a>"
            $('#map').append(tag);
            // TODO Fix below line, if you remove it you will have to click 2 times on marker for deletion
            $(".marker:last").trigger("click") 
            reset();
            doDraggable();
          }
        }
      });    
    

    if ($("#sitemap-image-upload-holder").length){
      saveSiteMapImageOrSvg();
    }

  }  	
});

function saveSiteMapImageOrSvg(){
  var siteMapImageDropzone = new Dropzone("#sitemap-image-upload-holder", { url: "/communities/"+community_id+"/sitemaps/"+sitemap_id+"/save_sitemap_image"});
  Dropzone.options.siteMapImageDropzone = {
    uploadMultiple: true
  };

  siteMapImageDropzone.on("complete", function(file) {
    console.log(file);
    location.reload();
  });
  
  siteMapImageDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg" || file.type == "image/svg+xml")) {
      $(".divLoading").addClass("hidden");
      $('#image-and-svg-upload-warning').modal('show');
      siteMapImageDropzone.removeFile(file);
    }
  });
}