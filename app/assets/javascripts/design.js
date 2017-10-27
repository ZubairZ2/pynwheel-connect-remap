$(document).ready(function(){
  if ($('.is-home-page')[0]){
   showTabsAccordingToTheme(selected_theme); 
   set_primary_font_changes();
   set_secondary_font_changes();
   var design_page_logo_upload_holder = document.getElementById('design-page-logo-upload-holder');
    if (design_page_logo_upload_holder){
        design_page_logo_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;    
          if(files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg"){ 
            readDesignPageLogoSrc(files[0]);
          }
          else{
            console.log('file type is not allowed');
            $('#image-upload-warning').modal('show');
          }          
      }
    }

    var secondary_page_background_image_upload_holder = document.getElementById('secondary-page-background-image-upload-holder');
    if (secondary_page_background_image_upload_holder){
        secondary_page_background_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;    
          if(files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg"){ 
            readSecondaryPageBackgroundImageSrc(files[0]);
          }
          else{
            console.log('file type is not allowed');
            $('#image-upload-warning').modal('show');
          }          
      }
    }


    if ($('#main-screen-radio').is(':checked')){
      $('#main-screen').show();
      $('#home-screen').hide();
    }

    if ($('#home-screen-radio').is(':checked')){
      $('#main-screen').hide();
      $('#home-screen').show();
    }


    hideShowBackgroundColorDiv($('#community_design_attributes_menu_attributes_manage_background'),$('#c-style-background-color '),$('#c-style-background-color-text-field'));
    $('#community_design_attributes_menu_attributes_manage_background').change(function(){
      hideShowBackgroundColorDiv($(this),$('#c-style-background-color '),$('#c-style-background-color-text-field'));
    });


  }
  
  $('.theme-selection').click(function(){
    var theme_name = $(this).data("theme-name");
    $('#community_theme_name_'+theme_name).prop("checked",true);
    $('.select-theme').removeClass('active-theme');
    $('#'+theme_name+'-theme').addClass('active-theme');
    $('#theme-form').submit();
  });

  $('.font-field').change(function(){
    $('#font-form').submit();
  });

  $('.menu-field').change(function(){
    $('#menu-form').submit();
  });

  $('.overlay-field').change(function(){
    $('#overlay-form').submit();
  });

  $('.custom-style-field').change(function(){
    $('#custom-style-form').submit();
  });

  $('.main-screen-field').change(function(){
    $('#main-screen-button-style-form').submit();
  });

  $('.home-screen-field').change(function(){
    $('#home-screen-button-style-form').submit();
  });

  $('.primary-inputs').change(function(){
    set_primary_font_changes();
  });

  $('.secondary-inputs').change(function(){
    set_secondary_font_changes();
  });

  $("#logo").change(function(){
    readDesignPageLogoSrcFromInput(this);
  });

  $("#secondary_page_background_image ").change(function(){
    readSecondaryBackgroundImageFromInput(this);
  });
  

  //image preview code

  $("#community_design_attributes_main_screen_attributes_appartments_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-appartments-button-image'),'appartments_button',$('#main_screen_id').val(),true);
  });

  $("#community_design_attributes_main_screen_attributes_galleries_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-galleries-button-image'),'galleries_button',$('#main_screen_id').val(),true);
  });

  $("#community_design_attributes_main_screen_attributes_neighborhood_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-neighborhood-button-image'),'neighborhood_button',$('#main_screen_id').val(),true);
  });

  $("#community_design_attributes_main_screen_attributes_favorities_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-favorities-button-image'),'favorities_button',$('#main_screen_id').val(),true);
  });

  $("#community_design_attributes_home_screen_attributes_appartments_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-appartments-button-image'),'appartments_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_galleries_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-galleries-button-image'),'galleries_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_neighborhood_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-neighborhood-button-image'),'neighborhood_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_favorities_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-favorities-button-image'),'favorities_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_about_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-about-button-image'),'about_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_floorplan_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-floorplan-button-image'),'floorplan_button',$('#home_screen_id').val(),false);
  });

  $("#community_design_attributes_home_screen_attributes_building_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-building-button-image'),'building_button',$('#home_screen_id').val(),false);
  });


 //hide show main screen home screen on the basis of radio button

 $('#main-screen-radio').click(function(){
 	if ($(this).is(':checked')){
 		$('#main-screen').show();
 		$('#home-screen').hide();
 	}
 });

 $('#home-screen-radio').click(function(){
 	  if ($(this).is(':checked')){
 		 $('#main-screen').hide();
 		 $('#home-screen').show();
 	  }
  });

 showSelectedMenuPosition();
 $('#community_design_attributes_menu_attributes_position').change(function(){
   showSelectedMenuPosition(); 
 });


});


function showSelectedMenuPosition(){
  if ($('#community_design_attributes_menu_attributes_position').val() == "Horizontal"){
    $('#horizontal-menu-position').show();
    $('#vertical-menu-position').hide(); 
  }
  else{
    $('#horizontal-menu-position').hide();
    $('#vertical-menu-position').show(); 
  }
}



function readURLOnDesignPage(input,preview_element,button_name,screen_id,main_screen) {

    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              $(input).val('');
              $(preview_element).attr('src', e.target.result);
              if (main_screen){
                designPageMainScreenbutton(e.target.result,button_name,screen_id);
              }
              else{
                console.log(screen_id);
                designPageHomeScreenbutton(e.target.result,button_name,screen_id);
              }
              
          }

          reader.readAsDataURL(input.files[0]);
      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
 }




function set_primary_font_changes(){
  $("#primary-font-text").css({"font-family":$('.primary_font_family').val(),"color": $('.primary_font_color').val(),"font-size": $('.primary_font_size').val(),"font-weight": $('.primary_font_weight').val(),"text-align": $('.primary_text_align').val()});
}

function set_secondary_font_changes(){
  $("#secondary-font-text").css({"font-family":$('.secondary_font_family').val(),"color": $('.secondary_font_color').val(),"font-size": $('.secondary_font_size').val(),"font-weight": $('.secondary_font_weight').val(),"text-align": $('.secondary_text_align').val()});
} 

function readDesignPageLogoSrc(file){
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#preview-image').attr('src', e.target.result);
    designPageLogo(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readSecondaryPageBackgroundImageSrc(file){
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#secondary-image-preview-image').attr('src', e.target.result);
    secondaryPageBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}


function designPageLogo(src){
    $(".divLoading").removeClass("hidden");
    var url = "/communities/"+community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {logo: src}
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }

 function secondaryPageBackgroundImage(src){
  $(".divLoading").removeClass("hidden");
    var url = "/communities/"+community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id,secondary_page_background_image: src}}
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }

 function designPageMainScreenbutton(src,button,screen_id){
    $(".divLoading").removeClass("hidden");
    var url = "/communities/"+community_id;
    var data_hash = {}
    switch (button) { 
      case 'appartments_button': 
        data_hash = {id: screen_id,appartments_button: src}
        break;
      case 'galleries_button': 
        data_hash = {id: screen_id,galleries_button: src}
        break;
      case 'neighborhood_button': 
        data_hash = {id: screen_id,neighborhood_button: src}
        break;    
      case 'favorities_button': 
        data_hash = {id: screen_id,favorities_button: src}
        break;
    }
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id,main_screen_attributes: data_hash}}
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }

 function designPageHomeScreenbutton(src,button,screen_id){
    $(".divLoading").removeClass("hidden");
    var url = "/communities/"+community_id;
    var data_hash = {}
    switch (button) { 
      case 'appartments_button': 
        data_hash = {id: screen_id,appartments_button: src}
        break;
      case 'galleries_button': 
        data_hash = {id: screen_id,galleries_button: src}
        break;
      case 'neighborhood_button': 
        data_hash = {id: screen_id,neighborhood_button: src}
        break;    
      case 'favorities_button': 
        data_hash = {id: screen_id,favorities_button: src}
        break;
      case 'about_button': 
        data_hash = {id: screen_id,about_button: src}
        break;
      case 'floorplan_button': 
        data_hash = {id: screen_id,floorplan_button: src}
        break;
      case 'building_button': 
        data_hash = {id: screen_id,building_button: src}
        break;      
    }
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id,home_screen_attributes: data_hash}}
        }
    }).done(function(){
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
 }

 function readDesignPageLogoSrcFromInput(input) {
    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              $('#preview-image').attr('src', e.target.result);
              $('#preview-image').parent().attr('href', e.target.result);
              designPageLogo(e.target.result);
          }

          reader.readAsDataURL(input.files[0]);
      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
}

function readSecondaryBackgroundImageFromInput(input) {
    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              $('#secondary-image-preview-image').attr('src', e.target.result);
              secondaryPageBackgroundImage(e.target.result);
          }

          reader.readAsDataURL(input.files[0]);
      }
      else{
        $(input).val('');
        $('#image-upload-warning').modal('show');
        //console.log($(input).val());
      }
    }
}


function hideShowBackgroundColorDiv(radio_button,element,text_field){
  if ($(radio_button).is(":checked")){
    $(element).show();
  }
  else{
    $(element).hide();
  }
}

function showTabsAccordingToTheme(theme){
  if (theme == 'cubist' || theme == 'modernist'){
    $('#font-tab').parent().removeClass('hidden'); 
    $('#menu-tab').parent().removeClass('hidden');
    $('#custom-style-tab').parent().parent().parent().addClass('hidden'); 
    $('#overlay-tab').parent().addClass('hidden');  
  }
  if (theme == 'expressionist'){
    $('#font-tab').parent().removeClass('hidden');
    $('#menu-tab').parent().removeClass('hidden');
    $('#custom-style-tab').parent().parent().parent().removeClass('hidden'); 
    $('#overlay-tab').parent().removeClass('hidden');  
  }
  if (theme == 'futurist'){
    $('#font-tab').parent().addClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    $('#custom-style-tab').parent().parent().parent().addClass('hidden');
    $('#overlay-tab').parent().addClass('hidden');   
  }
}

function hexToRgbA(hex){
    hex = hex.replace('#','');
    r = parseInt(hex.substring(0,2), 16);
    g = parseInt(hex.substring(2,4), 16);
    b = parseInt(hex.substring(4,6), 16);
    o = parseInt(hex.substring(6,8), 16);
    result = 'rgba('+r+','+g+','+b+','+o/255+')';
    return result;   
}