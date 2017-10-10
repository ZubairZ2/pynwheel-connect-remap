$(document).ready(function(){
  if ($('.is-home-page')[0]){
    if (theme_tab){
      $('#theme-tab').click();
    }
    if (color_tab){
      $('#color-tab').click();
    }
    if (custom_style_tab){
      $('#custom-style-tab').click();
    }
    if (button_tab){
      $('#button-tab').click();
    }
    if (overlay_tab){
      $('#overlay-tab').click();
    }
    if (home_tab){
      $('#home-tab').click();
    }
    if (font_tab){
      $('#font-tab').click();
      set_primary_font_changes();
      set_secondary_font_changes();
    }
 }
  
  $('.theme-selection').click(function(){
    var theme_name = $(this).data("theme-name");
    $('#community_theme_name_'+theme_name).attr('checked',true);
    $('.select-theme').removeClass('active-theme');
    $('#'+theme_name+'-theme').addClass('active-theme');
  });

  $('.primary-inputs').change(function(){
    set_primary_font_changes();
  });

  $('.secondary-inputs').change(function(){
    set_secondary_font_changes();
  });

  function set_primary_font_changes(){
    $("#primary-font-text").css({"font-family":$('.primary_font_family').val(),"color": $('.primary_font_color').val(),"font-size": $('.primary_font_size').val(),"font-weight": $('.primary_font_weight').val(),"text-align": $('.primary_text_align').val()});
  }

  function set_secondary_font_changes(){
    $("#secondary-font-text").css({"font-family":$('.secondary_font_family').val(),"color": $('.secondary_font_color').val(),"font-size": $('.secondary_font_size').val(),"font-weight": $('.secondary_font_weight').val(),"text-align": $('.secondary_text_align').val()});
  }	

  //image preview code

  $("#community_design_attributes_main_screen_attributes_appartments_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-appartments-button-image'));
  });

  $("#community_design_attributes_main_screen_attributes_galleries_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-galleries-button-image'));
  });

  $("#community_design_attributes_main_screen_attributes_neighborhood_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-neighborhood-button-image'));
  });

  $("#community_design_attributes_main_screen_attributes_favorities_button").change(function(){
    readURLOnDesignPage(this,$('#preview-main-screen-favorities-button-image'));
  });

  $("#community_design_attributes_home_screen_attributes_appartments_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-appartments-button-image'));
  });

  $("#community_design_attributes_home_screen_attributes_galleries_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-galleries-button-image'));
  });

  $("#community_design_attributes_home_screen_attributes_neighborhood_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-neighborhood-button-image'));
  });

  $("#community_design_attributes_home_screen_attributes_favorities_button").change(function(){
    readURLOnDesignPage(this,$('#preview-home-screen-favorities-button-image'));
  });


  function readURLOnDesignPage(input,preview_element) {

    if (input.files && input.files[0]) {
        if(input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg"){ 
          var reader = new FileReader();

          reader.onload = function (e) {
              $(preview_element).attr('src', e.target.result);
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
});