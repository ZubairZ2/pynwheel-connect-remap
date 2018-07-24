$(document).ready(function () {
  if ($('.is-home-page')[0]) {
    showTabsAccordingToTheme(selected_theme);
    set_primary_font_changes();
    set_secondary_font_changes();
    var design_page_logo_upload_holder = document.getElementById('design-page-logo-upload-holder');
    if (design_page_logo_upload_holder) {
      design_page_logo_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          readDesignPageLogoSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var design_page_secondary_logo_upload_holder = document.getElementById('design-page-secondary-logo-upload-holder');
    if (design_page_secondary_logo_upload_holder) {
      design_page_secondary_logo_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          readDesignPageSecondaryLogoSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var secondary_page_background_image_upload_holder = document.getElementById('secondary-page-background-image-upload-holder');
    if (secondary_page_background_image_upload_holder) {
      secondary_page_background_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          readSecondaryPageBackgroundImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var global_nav_button_on_image_upload_holder = document.getElementById('global-nav-button-on-image-upload-holder');
    if (global_nav_button_on_image_upload_holder) {
      global_nav_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          readGlobalNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var global_nav_button_off_image_upload_holder = document.getElementById('global-nav-button-off-image-upload-holder');
    if (global_nav_button_off_image_upload_holder) {
      global_nav_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          readGlobalNavButtonOffSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var filter_button_image_upload_holder = document.getElementById('filter-button-image-upload-holder');
    if (filter_button_image_upload_holder) {
      filter_button_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          filterButtonSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var gallery_button_image_upload_holder = document.getElementById('gallery-button-image-upload-holder');
    if (gallery_button_image_upload_holder) {
      gallery_button_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          galleryButtonSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var filter_panel_background_button_image_upload_holder = document.getElementById('filter-panel-background-button-image-upload-holder');
    if (filter_panel_background_button_image_upload_holder) {
      filter_panel_background_button_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          filterPanelBackgroundImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var home_page_button_image_upload_holder = document.getElementById('home-page-button-image-upload-holder');
    if (home_page_button_image_upload_holder) {

      home_page_button_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          homePageButtonImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    
    var gallery_image_on_upload_holder = document.getElementById('gallery-image-on-upload-holder');
    if (gallery_image_on_upload_holder) {

      gallery_image_on_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
          galleryImageOnSrc(files[0]);
        } else {
          $('#image-upload-warning').modal('show');
        }
      }
    }


    if ($('#main-screen-radio').is(':checked')) {
      $('#main-screen').show();
      $('#home-screen').hide();
    }

    if ($('#home-screen-radio').is(':checked')) {
      $('#main-screen').hide();
      $('#home-screen').show();
    }


    hideShowBackgroundColorDiv($('#community_design_attributes_menu_attributes_manage_background'), $('#c-style-background-color '), $('#c-style-background-color-text-field'));
    $('#community_design_attributes_menu_attributes_manage_background').change(function () {
      hideShowBackgroundColorDiv($(this), $('#c-style-background-color '), $('#c-style-background-color-text-field'));
    });


  }

  $('.theme-selection').click(function () {
    var theme_name = $(this).data("theme-name");
    $('#community_theme_name_' + theme_name).prop("checked", true);
    $('.select-theme').removeClass('active-theme');
    $('#' + theme_name + '-theme').addClass('active-theme');
    $('#theme-form').submit();
  });

  $('.font-field').change(function () {
    $('#font-form').submit();
  });

  $('.menu-field').change(function () {
    $('#menu-form').submit();
  });

  // $('.overlay-field').change(function(){
  //   $('#overlay-form').submit();
  // });

  $('.global-navigation-field').change(function () {
    $('#global_navigation_tab').submit();
  });

  $('.filter-panel-field').change(function () {
    $('#filter-panel-form').submit();
  });

  $('.home-page-field').change(function () {
    $('#home-page-form').submit();
  });

  $('.map-marker-field').change(function () {
    $('#map-marker-form').submit();
  });

  $('.floorplan-unit-popup-field').change(function () {
    $('#floorplan-unit-popup-form').submit();
  });

  $('.gables-field').change(function () {
    $('#gables-form').submit();
  });

  $('.custom-style-field').change(function () {
    $('#custom-style-form').submit();
  });

  $('.main-screen-field').change(function () {
    $('#main-screen-button-style-form').submit();
  });

  $('.home-screen-field').change(function () {
    $('#home-screen-button-style-form').submit();
  });

  $('.primary-inputs').change(function () {
    set_primary_font_changes();
  });

  $('.secondary-inputs').change(function () {
    set_secondary_font_changes();
  });

  $("#logo").change(function () {
    readDesignPageLogoSrcFromInput(this);
  });

  $("#secondary_logo").change(function () {
    readDesignPageSecondaryLogoSrcFromInput(this);
  });

  $("#secondary_page_background_image ").change(function () {
    readSecondaryBackgroundImageFromInput(this);
  });


  $("#global_nav_button_on").change(function () {
    readGlobalNavButtonOnFromInput(this);
  });

  $("#global_nav_button_off").change(function () {
    readGlobalNavButtonOffFromInput(this);
  });

  $("#filter_button").change(function () {
    readFilterButtonFromInput(this);
  });

  $("#gallery_button").change(function () {
    readGalleryButtonFromInput(this);
  });

  $("#filter_panel_background_image").change(function () {
    readFilterPanelBackgroundImageFromInput(this);
  });

  $("#home_page_button_image").change(function () {
    readHomePageButtonImageFromInput(this);
  });
  
  $("#gallery_button_on_image").change(function () {
    readGalleryImageOnFromInput(this);
  });


  //image preview code

  $("#community_design_attributes_main_screen_attributes_appartments_button").change(function () {
    readURLOnDesignPage(this, $('#preview-main-screen-appartments-button-image'), 'appartments_button', $('#main_screen_id').val(), true);
  });

  $("#community_design_attributes_main_screen_attributes_galleries_button").change(function () {
    readURLOnDesignPage(this, $('#preview-main-screen-galleries-button-image'), 'galleries_button', $('#main_screen_id').val(), true);
  });

  $("#community_design_attributes_main_screen_attributes_neighborhood_button").change(function () {
    readURLOnDesignPage(this, $('#preview-main-screen-neighborhood-button-image'), 'neighborhood_button', $('#main_screen_id').val(), true);
  });

  $("#community_design_attributes_main_screen_attributes_favorities_button").change(function () {
    readURLOnDesignPage(this, $('#preview-main-screen-favorities-button-image'), 'favorities_button', $('#main_screen_id').val(), true);
  });

  $("#community_design_attributes_home_screen_attributes_appartments_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-appartments-button-image'), 'appartments_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_galleries_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-galleries-button-image'), 'galleries_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_neighborhood_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-neighborhood-button-image'), 'neighborhood_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_favorities_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-favorities-button-image'), 'favorities_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_about_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-about-button-image'), 'about_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_floorplan_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-floorplan-button-image'), 'floorplan_button', $('#home_screen_id').val(), false);
  });

  $("#community_design_attributes_home_screen_attributes_building_button").change(function () {
    readURLOnDesignPage(this, $('#preview-home-screen-building-button-image'), 'building_button', $('#home_screen_id').val(), false);
  });


  //hide show main screen home screen on the basis of radio button

  $('#main-screen-radio').click(function () {
    if ($(this).is(':checked')) {
      $('#main-screen').show();
      $('#home-screen').hide();
    }
  });

  $('#home-screen-radio').click(function () {
    if ($(this).is(':checked')) {
      $('#main-screen').hide();
      $('#home-screen').show();
    }
  });

  showSelectedMenuPosition();
  $('#community_design_attributes_menu_attributes_position').change(function () {
    showSelectedMenuPosition();
  });


});


function showSelectedMenuPosition() {
  if ($('#community_design_attributes_menu_attributes_position').val() == "Horizontal") {
    $('#horizontal-menu-position').show();
    $('#vertical-menu-position').hide();
  } else {
    $('#horizontal-menu-position').hide();
    $('#vertical-menu-position').show();
  }
}



function readURLOnDesignPage(input, preview_element, button_name, screen_id, main_screen) {

  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $(input).val('');
        $(preview_element).attr('src', e.target.result);
        $(preview_element).parent().attr('href', e.target.result);
        if (main_screen) {
          designPageMainScreenbutton(e.target.result, button_name, screen_id);
        } else {
          console.log(screen_id);
          designPageHomeScreenbutton(e.target.result, button_name, screen_id);
        }

      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}




function set_primary_font_changes() {
  $("#primary-font-text").css({"font-family": $('.primary_font_family').val(), "color": $('.primary_font_color').val(), "font-size": $('.primary_font_size').val(), "font-weight": $('.primary_font_weight').val(), "text-align": $('.primary_text_align').val()});
}

function set_secondary_font_changes() {
  $("#secondary-font-text").css({"font-family": $('.secondary_font_family').val(), "color": $('.secondary_font_color').val(), "font-size": $('.secondary_font_size').val(), "font-weight": $('.secondary_font_weight').val(), "text-align": $('.secondary_text_align').val()});
}

function readDesignPageLogoSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#preview-image').attr('src', e.target.result);
    $('#preview-image').parent().attr('href', e.target.result);
    designPageLogo(e.target.result);
  }
  reader.readAsDataURL(file);
}


function readDesignPageSecondaryLogoSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#preview-image').attr('src', e.target.result);
    $('#preview-image').parent().attr('href', e.target.result);
    designPageSecondaryLogo(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readSecondaryPageBackgroundImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#secondary-image-preview-image').attr('src', e.target.result);
    $('#secondary-image-preview-image').parent().attr('href', e.target.result);
    secondaryPageBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readGlobalNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#global-nav-button-on-preview-image').attr('src', e.target.result);
    $('#global-nav-button-on-preview-image').parent().attr('href', e.target.result);
    globalNavButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readGlobalNavButtonOffSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#global-nav-button-off-preview-image').attr('src', e.target.result);
    $('#global-nav-button-off-preview-image').parent().attr('href', e.target.result);
    globalNavButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function filterButtonSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#filter-button-preview-image').attr('src', e.target.result);
    $('#filter-button-preview-image').parent().attr('href', e.target.result);
    filterButtonImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function galleryButtonSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#gallery-button-preview-image').attr('src', e.target.result);
    $('#gallery-button-preview-image').parent().attr('href', e.target.result);
    galleryButtonImage(e.target.result);
  }
  reader.readAsDataURL(file);
}


function filterPanelBackgroundImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#filter-panel-background-preview-image').attr('src', e.target.result);
    $('#filter-panel-background-preview-image').parent().attr('href', e.target.result);
    filterPanelBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function homePageButtonImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#home-page-button-image-preview').attr('src', e.target.result);
    $('#home-page-button-image-preview').parent().attr('href', e.target.result);
    homePageButtonImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function galleryImageOnSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#gallery-image-on-preview').attr('src', e.target.result);
    $('#gallery-image-on-preview').parent().attr('href', e.target.result);
    galleryImageOn(e.target.result);
  }
  reader.readAsDataURL(file);
}

function designPageLogo(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {logo: src}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function designPageSecondaryLogo(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {secondary_logo: src}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function secondaryPageBackgroundImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, secondary_page_background_image: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function globalNavButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, global_nav_button_on: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function globalNavButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, global_nav_button_off: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function filterButtonImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, filter_button: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}


function galleryButtonImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, gallery_button: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}


function filterPanelBackgroundImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, filter_panel_background_image: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function homePageButtonImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, home_page_button_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function galleryImageOn(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, gallery_button_on_image: src}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function designPageMainScreenbutton(src, button, screen_id) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  var data_hash = {}
  switch (button) {
    case 'appartments_button':
      data_hash = {id: screen_id, appartments_button: src}
      break;
    case 'galleries_button':
      data_hash = {id: screen_id, galleries_button: src}
      break;
    case 'neighborhood_button':
      data_hash = {id: screen_id, neighborhood_button: src}
      break;
    case 'favorities_button':
      data_hash = {id: screen_id, favorities_button: src}
      break;
  }
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, main_screen_attributes: data_hash}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function designPageHomeScreenbutton(src, button, screen_id) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  var data_hash = {}
  switch (button) {
    case 'appartments_button':
      data_hash = {id: screen_id, appartments_button: src}
      break;
    case 'galleries_button':
      data_hash = {id: screen_id, galleries_button: src}
      break;
    case 'neighborhood_button':
      data_hash = {id: screen_id, neighborhood_button: src}
      break;
    case 'favorities_button':
      data_hash = {id: screen_id, favorities_button: src}
      break;
    case 'about_button':
      data_hash = {id: screen_id, about_button: src}
      break;
    case 'floorplan_button':
      data_hash = {id: screen_id, floorplan_button: src}
      break;
    case 'building_button':
      data_hash = {id: screen_id, building_button: src}
      break;
  }
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, home_screen_attributes: data_hash}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function readDesignPageLogoSrcFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#preview-image').attr('src', e.target.result);
        $('#preview-image').parent().attr('href', e.target.result);
        designPageLogo(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readDesignPageSecondaryLogoSrcFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#preview-image').attr('src', e.target.result);
        $('#preview-image').parent().attr('href', e.target.result);
        designPageSecondaryLogo(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readSecondaryBackgroundImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#secondary-image-preview-image').attr('src', e.target.result);
        $('#secondary-image-preview-image').parent().attr('href', e.target.result);
        secondaryPageBackgroundImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function readGlobalNavButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#global-nav-button-on-preview-image').attr('src', e.target.result);
        $('#global-nav-button-on-preview-image').parent().attr('href', e.target.result);
        globalNavButtonOnImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function readGlobalNavButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#global-nav-button-off-preview-image').attr('src', e.target.result);
        $('#global-nav-button-off-preview-image').parent().attr('href', e.target.result);
        globalNavButtonOffImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function readFilterButtonFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#filter-button-preview-image').attr('src', e.target.result);
        $('#filter-button-preview-image').parent().attr('href', e.target.result);
        filterButtonImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function readGalleryButtonFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#gallery-button-preview-image').attr('src', e.target.result);
        $('#gallery-button-preview-image').parent().attr('href', e.target.result);
        galleryButtonImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function readFilterPanelBackgroundImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#filter-panel-background-preview-image').attr('src', e.target.result);
        $('#filter-panel-background-preview-image').parent().attr('href', e.target.result);
        filterPanelBackgroundImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readHomePageButtonImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#home-page-button-image-preview').attr('src', e.target.result);
        $('#home-page-button-image-preview').parent().attr('href', e.target.result);
        homePageButtonImage(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readGalleryImageOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        $('#gallery-image-on-preview').attr('src', e.target.result);
        $('#gallery-image-on-preview').parent().attr('href', e.target.result);
        galleryImageOn(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}


function hideShowBackgroundColorDiv(radio_button, element, text_field) {
  if ($(radio_button).is(":checked")) {
    $(element).show();
  } else {
    $(element).hide();
  }
}

function showTabsAccordingToTheme(theme) {
  if (theme == 'cubist' || theme == 'modernist') {
    $('#font-tab').parent().removeClass('hidden');
    $('#menu-tab').parent().removeClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().addClass('hidden'); 
    //$('#overlay-tab').parent().addClass('hidden');
    $('#global-navigation-tab').parent().addClass('hidden');
    $('#filter-panel-tab').parent().addClass('hidden');
    $('#home-page-tab').parent().addClass('hidden');
    $('#map-marker-tab').parent().addClass('hidden');
    $('#floorplan-unit-popup-tab').parent().addClass('hidden');
    $('#gables-tab').parent().addClass('hidden');
  }
  if (theme == 'expressionist') {
    $('#font-tab').parent().addClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().removeClass('hidden'); 
    //$('#overlay-tab').parent().removeClass('hidden'); 
    $('#global-navigation-tab').parent().removeClass('hidden');
    $('#filter-panel-tab').parent().removeClass('hidden');
    $('#home-page-tab').parent().removeClass('hidden');
    $('#map-marker-tab').parent().removeClass('hidden');
    $('#floorplan-unit-popup-tab').parent().removeClass('hidden');
    $('#gables-tab').parent().addClass('hidden');
  }
  if (theme == 'futurist' || theme == 'gables_organic' || theme == 'gables_refined' || theme == 'gables_energetic' || theme == 'gables_natural') {
    $('#font-tab').parent().addClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
    //$('#overlay-tab').parent().addClass('hidden'); 
    $('#global-navigation-tab').parent().addClass('hidden');
    $('#filter-panel-tab').parent().addClass('hidden');
    $('#home-page-tab').parent().addClass('hidden');
    $('#map-marker-tab').parent().addClass('hidden');
    $('#floorplan-unit-popup-tab').parent().addClass('hidden');
    $('#gables-tab').parent().addClass('hidden');
  }
  if (theme == 'futurist') {
    $('#font-tab').parent().addClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
    //$('#overlay-tab').parent().addClass('hidden'); 
    $('#global-navigation-tab').parent().addClass('hidden');
    $('#filter-panel-tab').parent().addClass('hidden');
    $('#home-page-tab').parent().addClass('hidden');
    $('#map-marker-tab').parent().addClass('hidden');
    $('#floorplan-unit-popup-tab').parent().addClass('hidden');
    $('#gables-tab').parent().addClass('hidden');
  }
  if (theme == 'gables_organic' || theme == 'gables_refined' || theme == 'gables_energetic' || theme == 'gables_natural') {
    $('#font-tab').parent().addClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
    //$('#overlay-tab').parent().addClass('hidden'); 
    $('#global-navigation-tab').parent().addClass('hidden');
    $('#filter-panel-tab').parent().addClass('hidden');
    $('#home-page-tab').parent().addClass('hidden');
    $('#map-marker-tab').parent().addClass('hidden');
    $('#floorplan-unit-popup-tab').parent().addClass('hidden');
    $('#gables-tab').parent().removeClass('hidden');
  }
}

function hexToRgbA(hex) {
  hex = hex.replace('#', '');
  r = parseInt(hex.substring(0, 2), 16);
  g = parseInt(hex.substring(2, 4), 16);
  b = parseInt(hex.substring(4, 6), 16);
  o = parseInt(hex.substring(6, 8), 16);
  result = 'rgba(' + r + ',' + g + ',' + b + ',' + o / 255 + ')';
  return result;
}



function setBorderOptions(border_element, value) {
  if (value == "Circular") {
    $(border_element).children("option[value^=Top-Bottom]").hide();
    $(border_element).children("option[value^=Left-Right]").hide();
    $(border_element).val("All sides");
    $('.button-width-field').hide();
  } else {
    $(border_element).children("option[value^=Top-Bottom]").show();
    $(border_element).children("option[value^=Left-Right]").show();
    $('.button-width-field').show();
  }
  setFontSize(value);
}

function setLogoSize(value) {
  if (value == 'Right' || value == 'Left') {
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').val('487x160');
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").hide();
    $('#community_design_attributes_home_page_buttons_width').val('350px');
  }
  else{
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").show();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').val('450x200');
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").show();
    $('#community_design_attributes_home_page_buttons_width').val('450px');
  }
}


function setFontSize(value){
  if (value == "Circular"){
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=14px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=16px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=22px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=24px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=26px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=28px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=30px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').val('14px')
  }
  else{
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=14px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=16px]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=22px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=24px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=26px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=28px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=30px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').val('18px');
  }
}