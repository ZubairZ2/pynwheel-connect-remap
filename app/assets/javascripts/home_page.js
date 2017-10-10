$(document).ready(function(){
	$("#home-page-image").change(function(){
		//console.log('ddddddddd');
    	readHomePageImage(this);
    });
});


function readHomePageImage(input){
	if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              homePageImage(e.target.result,"Image1");
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
        console.log("success");
    });
 }