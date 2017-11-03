$(document).ready(function(){
  $('.sortable').railsSortable(); 
	$("#home-page-images").change(function(){
      var files = $(this).prop("files")
      for (var i = 0; i < files.length; i++) {
          if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
            readHomePageImageSrc(files[i]);
        } 
      }
      if(files.length == 1){
        if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
          $('#image-upload-warning').modal('show');
        } 
      }
      $("#home-page-image").val(''); 
    });
  // below lines are doing drag and drop on home page
  imageDragNdrop();

  $('#images-loop-type-radio').click(function(){
    if ($(this).is(':checked')){
      $('#image-slide').addClass('active');
      $('#image-slide').addClass('in');
      $('#video-slide').removeClass('active');
      $('#video-slide').removeClass('in');
      saveLoopType("images");
    }
  });

  $('#video-loop-type-radio').click(function(){
    if ($(this).is(':checked')){
     $('#image-slide').removeClass('active');
     $('#image-slide').removeClass('in');
     $('#video-slide').addClass('active');
     $('#video-slide').addClass('in');
     saveLoopType("video");
    }
  });


  if ($('#images-loop-type-radio').is(':checked')){
      $('#image-slide').addClass('active');
      $('#image-slide').addClass('in');
      $('#video-slide').removeClass('active');
      $('#video-slide').removeClass('in');
  }

  if ($('#video-loop-type-radio').is(':checked')){
    $('#image-slide').removeClass('active');
    $('#image-slide').removeClass('in');
    $('#video-slide').addClass('active');
    $('#video-slide').addClass('in');
  }


});

$(document).ready(function(){
  $("#home-page-video").change(function(){
      readHomePageVideo(this);
    });
});

function imageDragNdrop(){
  var home_page_image_upload_holder = document.getElementById('home-page-image--upload-holder');
  if (home_page_image_upload_holder){
      home_page_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files.length > 0){
            for (var i = 0; i < files.length; i++) {
              if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
                readHomePageImageSrc(files[i]);
              }
            }
        }
        if(files.length == 1){
          console.log('checking files length. if a single file is dragged and it is not an image then show alert message');
          if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
            $('#image-upload-warning').modal('show');
          } 
        }          
    }
  }
}

function saveLoopType(loop_type){
    console.log(loop_type);
    var url = "/communities/"+community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id,loop_type: loop_type}}
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}

function readHomePageImageSrc(file){
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    homePageImage(e.target.result,file.name);
  }
  reader.readAsDataURL(file);
}


function homePageImage(src,name){
	var url = "/communities/"+community_id+"/home_page/save_home_page_image"
    $.ajax({
        url: url,
        type: "POST",
        dataType: "script",
        data: {
            name: name,
            src: src
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }

 function readHomePageVideo(input){
  if (input.files && input.files[0]) {
        console.log(input.files[0].type);
        console.log(input.files[0].size);
        var file_size = input.files[0].size;
        var file_size_in_mb = parseFloat(file_size)/1000000;
        console.log(file_size_in_mb);
        if(input.files[0].type == "video/mp4" || input.files[0].type == "video/webm"){
          if (file_size_in_mb < 100){
            $(".divLoading").removeClass("hidden"); 
            var reader = new FileReader();

            reader.onload = function (e) {
                homePageVideo(e.target.result,input.files[0].name);
                $(input).val('');
            }

            reader.readAsDataURL(input.files[0]);
          }
          else{
            $('#large-size-file-error').modal('show');
          }
      }
      else{
        $(input).val('');
        $('#video-upload-warning').modal('show');
      }
    }
}


function homePageVideo(src,name){
  var url = "/communities/"+community_id+"/home_page/save_home_page_video"
    $.ajax({
        url: url,
        type: "POST",
        dataType: "script",
        data: {
            name: name,
            src: src
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }