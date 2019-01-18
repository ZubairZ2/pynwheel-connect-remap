$(document).ready(function(){
  //************************* Favorite Images Upload using dropzone plugin **************//
  if ($("#favorite-image-upload-holder").length){
    saveFavoriteImage(); 
  }
});

function saveFavoriteImage(){

  var favoriteImageDropzone = new Dropzone("#favorite-image-upload-holder", { url: "/communities/"+community_id+"/favorite_settings/"+favorite_setting_id+"/save_favorite_image"});
  Dropzone.options.favoriteImageDropzone = {
    uploadMultiple: true
  };

  favoriteImageDropzone.on("complete", function(file) {
    console.log(file);
    fetchFavoriteImages();
  });
  
  favoriteImageDropzone.on("addedfile", function(file) {
    console.log(file.type);
    $(".divLoading").removeClass("hidden");
    if (!(file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg" || file.type == "video/mp4")) {
      $(".divLoading").addClass("hidden");
      $('#image-and-video-upload-warning').modal('show');
      favoriteImageDropzone.removeFile(file);
    }
      if ((file.type == "image/png" || file.type == "image/jpeg" || file.type == "image/jpg")&& (file.size > 10000000))
      {
          $(".divLoading").addClass("hidden");
          $('#image-size-warning').modal('show');
          favoriteImageDropzone.removeFile(file);
      }
  });
}

function fetchFavoriteImages(){
  var url = "/communities/"+community_id+"/favorite_settings/"+favorite_setting_id+"/show_images"
  $.ajax({
      url: url,
      type: "GET",
      dataType: "script"
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("Favorite images are fetch successfully.");
    });
}