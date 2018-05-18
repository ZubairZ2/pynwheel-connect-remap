$(document).ready(function(){
  $('.sortable').railsSortable(); 
  
  $('#animation').on('change',function(){
    saveAnimation($(this).val());
  });

 
 Dropzone.prototype.defaultOptions['headers'] = {
    'X-CSRF-Token': $('meta[name="csrf-token"]').attr('content')
  };
  //************************* Home Page Images Upload using dropzone plugin **************//
  if ($("#home-page-image-upload-holder").length){
    saveHomePageImage();
  } 

  if ($("#home-page-icon-upload-holder").length){
    saveHomePageIcon();
  } 
  //************************* Home Page Images Upload using dropzone plugin **************//

  //************************* Home Page Video Upload using dropzone plugin **************//
  if ($("#home-page-video-upload-holder").length){
    saveHomePageVideo(); 
  }
  //************************* Home Page Video Upload using dropzone plugin **************//

  //************************* Gallery Images Upload using dropzone plugin **************//
  if ($("#gallery-image-upload-holder").length){
    saveGalleryImage(); 
  }

  if ($("#additional-image-upload-holder").length){
    saveAdditionalImage(); 
  }
  //************************* Gallery Images Upload using dropzone plugin **************//

  // $("#gallery-images").change(function(){
  //     var files = $(this).prop("files")
  //     for (var i = 0; i < files.length; i++) {
  //         if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
  //           readGalleryImageSrc(files[i]);
  //       } 
  //     }
  //     if(files.length == 1){
  //       if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
  //         $('#image-upload-warning').modal('show');
  //       } 
  //     }
  //     $(this).val(''); 
  //   });

  $("#amenity-images").change(function(){
      var files = $(this).prop("files")
      for (var i = 0; i < files.length; i++) {
          if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
            readAmenityImageSrc(files[i],'community');
        } 
      }
      if(files.length == 1){
        if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
          $('#image-upload-warning').modal('show');
        } 
      }
      $(this).val(''); 
    });

    $("#floorplan-amenity-images").change(function(){
      var files = $(this).prop("files")
      for (var i = 0; i < files.length; i++) {
          if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
            readAmenityImageSrc(files[i],'floorplan');
        } 
      }
      if(files.length == 1){
        if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
          $('#image-upload-warning').modal('show');
        } 
      }
      $(this).val(''); 
    });

    $("#sitemap-amenity-images").change(function(){
      var files = $(this).prop("files")
      for (var i = 0; i < files.length; i++) {
          if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
            readAmenityImageSrc(files[i],'sitemap');
        } 
      }
      if(files.length == 1){
        if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
          $('#image-upload-warning').modal('show');
        } 
      }
      $(this).val(''); 
    });

  // below lines are doing drag and drop on home page
  //imageDragNdrop();
  //imageGalleryDragNdrop()
  imageAmenityDragNdrop()
  imageFloorplanAmenityDragNdrop()
  imageSitemapAmenityDragNdrop()

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

  // $("#home_page_video_video").change(function(){
  //     if(this.files[0].type == "video/mp4"){
  //       $(".divLoading").removeClass("hidden"); 
  //       $('#home-page-video-form').submit();
  //     }
  //     else{
  //       $(this).val('');
  //       $('#video-upload-warning').modal('show');
  //     }
  // });

  // $("#gallery_page_video").change(function(){
  //     if(this.files[0].type == "video/mp4"){
  //       $(".divLoading").removeClass("hidden"); 
  //       $('#gallery-page-video-form').submit();
  //     }
  //     else{
  //       $(this).val('');
  //       $('#video-upload-warning').modal('show');
  //     }
  // });

});

// function imageDragNdrop(){
//   var home_page_image_upload_holder = document.getElementById('home-page-image--upload-holder');
//   if (home_page_image_upload_holder){
//       home_page_image_upload_holder.ondrop = function (e) {
//         e.preventDefault();
//         files = e.dataTransfer.files;
//         if (files.length > 0){
//             for (var i = 0; i < files.length; i++) {
//               if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
//                 readHomePageImageSrc(files[i]);
//               }
//             }
//         }
//         if(files.length == 1){
//           console.log('checking files length. if a single file is dragged and it is not an image then show alert message');
//           if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
//             $('#image-upload-warning').modal('show');
//           } 
//         }          
//     }
//   }
// }

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


function saveAnimation(value){
    console.log(value);
    var url = "/communities/"+community_id+"/home_page/update_animation";
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
          design_id: design_id,
          animation: value
        }
    });
}

// function readHomePageImageSrc(file){
//   $(".divLoading").removeClass("hidden");
//   var reader = new FileReader();
//   reader.onload = function (e) {
//     homePageImage(e.target.result,file.name);
//   }
//   reader.readAsDataURL(file);
// }


// function homePageImage(src,name){
//  var url = "/communities/"+community_id+"/home_page/save_home_page_image"
//     $.ajax({
//         url: url,
//         type: "POST",
//         dataType: "script",
//         data: {
//             name: name,
//             src: src
//         }
//     }).done(function(){
//         $(".divLoading").addClass("hidden");
//         console.log("success");
//     });
//  }

//  function readGalleryImageSrc(file){
//   $(".divLoading").removeClass("hidden");
//   var reader = new FileReader();
//   reader.onload = function (e) {
//     galleryImage(e.target.result,file.name);
//   }
//   reader.readAsDataURL(file);
// }

// function galleryImage(src,name){
//   var url = "/communities/"+community_id+"/galleries/"+gallery_id+"/save_gallery_image"
//     $.ajax({
//         url: url,
//         type: "POST",
//         dataType: "script",
//         data: {
//             name: name,
//             src: src
//         }
//     }).done(function(){
//         $(".divLoading").addClass("hidden");
//         console.log("success");
//     });
//  }

//  function imageGalleryDragNdrop(){
//   var gallery_image_upload_holder = document.getElementById('gallery-image--upload-holder');
//   if (gallery_image_upload_holder){
//       gallery_image_upload_holder.ondrop = function (e) {
//         e.preventDefault();
//         files = e.dataTransfer.files;
//         if (files.length > 0){
//             for (var i = 0; i < files.length; i++) {
//               if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
//                 readGalleryImageSrc(files[i]);
//               }
//             }
//         }
//         if(files.length == 1){
//           console.log('checking files length. if a single file is dragged and it is not an image then show alert message');
//           if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
//             $('#image-upload-warning').modal('show');
//           } 
//         }          
//     }
//   }
// }

  function readAmenityImageSrc(file,type){
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
      AmenityImage(e.target.result,file.name,type);
    }
    reader.readAsDataURL(file);
  }

  function AmenityImage(src,name,type){
    if (type == "floorplate")
      var url = "/communities/"+community_id+"/floorplates/"+floorplate_id+"/amenities"
    else if (type == "floorplan")
      var url = "/communities/"+community_id+"/floorplans/"+floorplan_id+"/amenities"
    else if (type == "community")
      var url = "/communities/"+community_id+"/amenities"
    else
      var url = "/communities/"+community_id+"/sitemaps/"+sitemap_id+"/amenities"
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

  function imageAmenityDragNdrop(){
    var amenity_image_upload_holder = document.getElementById('amenity-image--upload-holder');
    if (amenity_image_upload_holder){
        amenity_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;
          if (files.length > 0){
              for (var i = 0; i < files.length; i++) {
                if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
                  readAmenityImageSrc(files[i],'community');
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

  function imageFloorplanAmenityDragNdrop(){
    var amenity_image_upload_holder = document.getElementById('floorplan-amenity-image--upload-holder');
    if (amenity_image_upload_holder){
        amenity_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;
          if (files.length > 0){
              for (var i = 0; i < files.length; i++) {
                if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
                  readAmenityImageSrc(files[i],'floorplan');
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

  function imageSitemapAmenityDragNdrop(){
    var amenity_image_upload_holder = document.getElementById('sitemap-amenity-image--upload-holder');
    if (amenity_image_upload_holder){
        amenity_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;
          if (files.length > 0){
              for (var i = 0; i < files.length; i++) {
                if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
                  readAmenityImageSrc(files[i],'sitemap');
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

function fetchHomePageImages(){
  var url = "/communities/"+community_id+"/home_page"
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("home page images are fetched successfully.");
    });
}

function fetchHomePageIcons(){
  var url = "/communities/"+community_id+"/homepage_icons"
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("home page secondary images are fetched successfully.");
    });
}

function fetchHomePageVideo(){
  var url = "/communities/"+community_id+"/home_page/show_home_page_video"
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("Video is fetch successfully.");
    });
}

function fetchGalleryImages(){
  var url = "/communities/"+community_id+"/galleries/"+gallery_id+"/show_images"
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("gallery images are fetch successfully.");
    });
}

function fetchAdditionalImages(){
  var url = "/communities/"+community_id+"/imagepages/"+imagepage_id
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("Images are fetch successfully.");
    });
}

function saveGalleryImage(){
  var galleryImageDropzone = new Dropzone("#gallery-image-upload-holder", { url: "/communities/"+community_id+"/galleries/"+gallery_id+"/save_gallery_image"});
  Dropzone.options.galleryImageDropzone = {
    uploadMultiple: true
  };

  galleryImageDropzone.on("complete", function(file) {
    console.log(file);
    fetchGalleryImages();
  });
  
  galleryImageDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg" || file.type == "video/mp4")) {
      $(".divLoading").addClass("hidden");
      $('#image-and-video-upload-warning').modal('show');
      galleryImageDropzone.removeFile(file);
    }
  });
}

function saveAdditionalImage(){
  var additionalImageDropzone = new Dropzone("#additional-image-upload-holder", { url: "/communities/"+community_id+"/imagepages/"+imagepage_id+"/save_additional_image"});
  Dropzone.options.additionalImageDropzone = {
    uploadMultiple: true
  };

  additionalImageDropzone.on("complete", function(file) {
    console.log(file);
    fetchAdditionalImages();
  });
  
  additionalImageDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg")) {
      $(".divLoading").addClass("hidden");
      $('#image-upload-warning').modal('show');
      additionalImageDropzone.removeFile(file);
    }
  });
}

function saveHomePageImage(){
  var homePageImageDropzone = new Dropzone("#home-page-image-upload-holder", { url: "/communities/"+community_id+"/home_page/save_home_page_image"});
  Dropzone.options.homePageImageDropzone = {
    uploadMultiple: true
  };

  homePageImageDropzone.on("complete", function(file) {
    console.log(file);
    fetchHomePageImages();
  });
  
  homePageImageDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg")) {
      $(".divLoading").addClass("hidden");
      $('#image-upload-warning').modal('show');
      homePageImageDropzone.removeFile(file);
    }
  });
}

function saveHomePageIcon(){
  var homePageIconDropzone = new Dropzone("#home-page-icon-upload-holder", { url: "/communities/"+community_id+"/homepage_icons/save_homepage_icon"});
  Dropzone.options.homePageIconDropzone = {
    uploadMultiple: true
  };

  homePageIconDropzone.on("complete", function(file) {
    console.log(file);
    fetchHomePageIcons();
  });
  
  homePageIconDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg")) {
      $(".divLoading").addClass("hidden");
      $('#image-upload-warning').modal('show');
      homePageIconDropzone.removeFile(file);
    }
  });
}

function saveHomePageVideo(){
  var homePageVideoDropzone = new Dropzone("#home-page-video-upload-holder", { url: "/communities/"+community_id+"/home_page/save_home_page_video"});
  Dropzone.options.homePageVideoDropzone = {
    uploadMultiple: true,
  };

  homePageVideoDropzone.on("complete", function(file) {
    console.log(file);
    location.reload();
  });
  
  homePageVideoDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "video/mp4")) {
      $(".divLoading").addClass("hidden");
      $('#video-upload-warning').modal('show');
      homePageVideoDropzone.removeFile(file);
    }
  });
}