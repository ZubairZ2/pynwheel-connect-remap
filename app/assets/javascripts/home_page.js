$(document).ready(function(){
    $('[data-toggle="popover"]').popover();
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
  $("#elevator-images").change(function(){
    var files = $(this).prop("files")
    for (var i = 0; i < files.length; i++) {
      if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){ 
        readElevatorImageSrc(files[i]);
      } 
    }
    if(files.length == 1){
      if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){ 
        $('#image-upload-warning').modal('show');
      } 
    }
    $(this).val(''); 
  });

  $("#elevator-gallery-images").change(function(){
      var files = $(this).prop("files")
      for (var i = 0; i < files.length; i++) {
        if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
          readElevatorGalleryImageSrc(files[i],'community');
        }
      }
      if(files.length == 1){
        if(files[0].type !== "image/png" && files[0].type !== "image/jpeg" && files[0].type !== "image/jpg"){
        $('#image-upload-warning').modal('show');
        }
      }
      $(this).val('');
  });

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
    $("#amenity-gallery-images").change(function(){
        var files = $(this).prop("files")
        for (var i = 0; i < files.length; i++) {
            if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                readAmenityGalleryImageSrc(files[i],'community');
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
    $("#unit-amenity-images").change(function(){
        var files = $(this).prop("files")
        for (var i = 0; i < files.length; i++) {
            if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                readAmenityImageSrc(files[i],'unit');

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
  imageAmenityUpdateDragNdrop()
  imageAmenityGalleryDragNdrop()
  imageFloorplanAmenityDragNdrop()
  imageSitemapAmenityDragNdrop()
  imageElevatorDragNdrop()
  imageElevatorGalleryDragNdrop()

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
  
  function readElevatorImageSrc(file){
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
      src = e.target.result
      name= file.name

      $.ajax({
        url: "/communities/"+community_id+"/elevators",
        type: "POST",
        dataType: "script",
        data: {
            name: name,
            src: src,
            elevator_id: elevator_id
        }
      }).done(function(){
          $(".divLoading").addClass("hidden");
          console.log("success");
          location.reload()
      });

    }
    reader.readAsDataURL(file);
  }

  function readAmenityImageSrc(file,type){
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
      AmenityImage(e.target.result,file.name,type);
    }
    reader.readAsDataURL(file);
  }
  function readAmenityGalleryImageSrc(file,type){
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
        AmenityGalleryImage(e.target.result,file.name,type);
    }
    reader.readAsDataURL(file);
  }

  function readElevatorGalleryImageSrc(file,type){
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
      ElevatorGalleryImage(e.target.result,file.name,type, elevator_id);
    }
    reader.readAsDataURL(file);
  }

  function AmenityImage(src,name,type){
    var amenityId = 0;
    if (type == "floorplate")
      var url = "/communities/"+community_id+"/floorplates/"+floorplate_id+"/amenities"
    else if (type == "floorplan")
      var url = "/communities/"+community_id+"/floorplans/"+floorplan_id+"/amenities"
    else if (type == "unit")
      var url = "/communities/"+community_id+"/units/"+unit_id+"/amenities"
    else if (type == "community")
    {amenityId = amenity_id;var url = "/communities/"+community_id+"/amenities"}
    else if (type == "elevator"){
      amenityId = elevator_id;
      var url = "/communities/"+community_id+"/elevators"
    }
    else
      var url = "/communities/"+community_id+"/sitemaps/"+sitemap_id+"/amenities"
    
    $.ajax({
        url: url,
        type: "POST",
        dataType: "script",
        data: {
            name: name,
            src: src,
            amenityId: amenityId
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
        if (type == "community"){location.reload();}
    });
  }
  function AmenityGalleryImage(src,name,type){
    var amenityId = amenity_id;
    var url = "/communities/"+community_id+"/amenities/saveAmenityGallery";
    $.ajax({
        url: url,
        type: "POST",
        dataType: "script",
        data: {
            name: name,
            src: src,
            amenityId: amenityId
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
  }

  function ElevatorGalleryImage(src,name,type, id){
    var elevator_id = id;
    var url = "/communities/"+community_id+"/elevators/save_elevator_gallery";
    $.ajax({
      url: url,
      type: "POST",
      dataType: "script",
      data: {
        name: name,
        src: src,
        elevator_id: elevator_id
      }
    }).done(function(){
      $(".divLoading").addClass("hidden");
      window.location.reload()
      console.log("success addin elevator gallery image");
    });
  }

  function imageElevatorDragNdrop(){
    var elevator_image_upload_holder = document.getElementById('elevator-image--upload-holder');
    if (elevator_image_upload_holder){
        elevator_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files.length > 0){
            for (var i = 0; i < files.length; i++) {
              if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                readAmenityImageSrc(files[i], 'elevator');
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

  function imageElevatorGalleryDragNdrop(){
      var amenity_image_upload_holder = document.getElementById('elevator-gallery-image-upload-holder');
      if (amenity_image_upload_holder){
        amenity_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;
          if (files.length > 0){
              for (var i = 0; i < files.length; i++) {
                  if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                    readElevatorGalleryImageSrc(files[i], 'elevator_gallery');
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
    function imageAmenityUpdateDragNdrop(){
        var amenity_image_upload_holder = document.getElementById('amenity-image-upload-holder');
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
    function imageAmenityGalleryDragNdrop(){
        var amenity_image_upload_holder = document.getElementById('amenity-gallery-image-upload-holder');
        if (amenity_image_upload_holder){
            amenity_image_upload_holder.ondrop = function (e) {
                e.preventDefault();
                files = e.dataTransfer.files;
                if (files.length > 0){
                    for (var i = 0; i < files.length; i++) {
                        if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                            readAmenityGalleryImageSrc(files[i],'community');

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
function imageFloorplanAmenityDragNdrop(){
    var amenity_image_upload_holder = document.getElementById('unit-amenity-image--upload-holder');
    if (amenity_image_upload_holder){
        amenity_image_upload_holder.ondrop = function (e) {
            e.preventDefault();
            files = e.dataTransfer.files;
            if (files.length > 0){
                for (var i = 0; i < files.length; i++) {
                    if(files[i].type == "image/png" || files[i].type == "image/jpeg" || files[i].type == "image/jpg"){
                        readAmenityImageSrc(files[i],'unit');
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

function FileListItem(a) {
    a = [].slice.call(Array.isArray(a) ? a : arguments)
    for (var c, b = c = a.length, d = !0; b-- && d;) d = a[b] instanceof File
    if (!d) throw new TypeError("expected argument to FileList is File or array of File objects")
    for (b = (new ClipboardEvent("")).clipboardData || new DataTransfer; c--;) b.items.add(a[c])
    return b.files
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
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg")) {
      $(".divLoading").addClass("hidden");
      // $('#image-and-video-upload-warning').modal('show');
      //   debugger;
        // f = video_field.files;
        // f.add(file)
        // f = file;
        dropHandler1(file);
        // $("#video_submit").click();
      galleryImageDropzone.removeFile(file);
    }


  });
}
function dropHandler1(e)
{
    if (e.size < 500000000)
    {
        if ( e.type == "video/mp4")
        {
            $(".divLoading").removeClass("hidden");
            // e.preventDefault();
            // console.log(e.dataTransfer);
            // setTimeout(function(){
            video_field.files = new FileListItem(e)
            // }, 5000);

            // video_field.files = e;
            $("#video_submit").click();
        }
        else
        {
            $('#video-upload-warning').modal('show');
        }
    }
    else
    {
        // $('#video-size-warning').modal('show');
    }
};
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
      if (file.size > 500000001)
      {
          $('#video-size-warning').modal('show');
      }
      else{
          location.reload();
      }
    console.log(file);

    $(".divLoading").addClass("hidden");

  });

  homePageVideoDropzone.on("addedfile", function(file) {
      if (file.size < 500000001)
      {
          if (!(file.type == "video/mp4")) {
                $(".divLoading").addClass("hidden");
                $('#video-upload-warning').modal('show');
                homePageVideoDropzone.removeFile(file);
          }
          else
          {
              $(".divLoading").removeClass("hidden");
              $.ajax({
                  type: "POST",
                  url: "/communities/" + community_id + "/home_page/save_home_page_video",
                  file: file,
                  success: function () {
                      console.log("sccuess");
                  },
                  error: function () {console.log("error");
                  }
              });
          }

        }
      else
      {
          // var message = '<div class="alert alert-success">Video uploaded successfully.</div>'
          // $('#flash-message').html(message);
          // setTimeout(function() {
          //     $('.alert').fadeOut('slow');
          // }, 10000);
          // $('#video-size-warning').modal('show');
      }
    // console.log(file.type);
    // debugger;
    // if (file.size <  500000001)
    // {
    //     $(".divLoading").removeClass("hidden");
    //     if (!(file.type == "video/mp4")) {
    //       $(".divLoading").addClass("hidden");
    //       $('#video-upload-warning').modal('show');
    //       homePageVideoDropzone.removeFile(file);
    //     }
    // }
    // else
    // {
    //     alert("not sized");
    // }
  });
}