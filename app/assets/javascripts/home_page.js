$(document).ready(function(){
	$("#home-page-image").change(function(){
		//console.log('ddddddddd');
    	readHomePageImage(this);
    });
});

$(document).ready(function(){
  $("#home-page-video").change(function(){
      readHomePageVideo(this);
    });
});


function readHomePageImage(input){
	if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          $(".divLoading").removeClass("hidden");
          var reader = new FileReader();

          reader.onload = function (e) {
              homePageImage(e.target.result,input.files[0].name);
          }

          reader.readAsDataURL(input.files[0]);
      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
      }
    }
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
  $(".divLoading").removeClass("hidden");
  if (input.files && input.files[0]) {
        //if(input.files[0].type == "mp4"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              homePageVideo(e.target.result,input.files[0].name);
          }

          reader.readAsDataURL(input.files[0]);
      /*}
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
      }*/
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