var image_height = 200;
var image_width = 200;
var characterLimit = 140;
$(document).ready(function () {
  if(document.getElementById('characterLimitCount'))
    characterLimit = parseInt(document.getElementById('characterLimitCount').textContent);

  // Locks Instruction Text Initializer
  zervLockIntructionText();
  latchLockIntructionText();
  
  dweloLockIntructionText();
  amenityDweloLockIntructionText();

  igloohomeLockIntructionText();
  edgestateLockIntructionText();

  // Elevator description
  editElevatorDescriptionField();
  editElevatorDirectionalTextField();

  // Locks Image Uploader
  uploadZervLockImage();
  uploadLatchLockImage();

  uploadDweloLockImage();
  uploadAmenityDweloLockImage();

  uploadIgloohomeLockImage();
  uploadEdgestateLockImage();

  // Logo
  uploadEmailLogo();

  //Floorplan Additional Image
  updloadFloorplanAdditionalImage()

  $('.amenity_edit_wysihtml5').each(function(i, elem) {
        $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
        events: {
            load:function(){
                $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
                  if (wysihtml5Editor.getValue() != "")
                  {
                    var text_split = $('.amenity_description_count').text().split(" ")
                    var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
                    $('.amenity_description_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
                  }
                });
                var wysihtml5Editor = $('#amenity_description').data("wysihtml5").editor;
                var t = wysihtml5Editor.getValue();
                if(t!= '')
                {
                  t1 = t.substr(0, characterLimit)
                  t2 = t.substr(characterLimit, t.length)
                  // t2 = t2.fontcolor("red");
                  wysihtml5Editor.setValue(t1 + t2);
                  var text_split = $('.amenity_description_count').text().split(" ")
                  var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
                  $('.amenity_description_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
                }
            },
        change: function() {
            $('.amenity_edit_field').change();
        }
        }
        });
      });
    $('.amenity_edit_directional_wysihtml5').each(function(i, elem) {
      if(document.getElementById('characterLimitCount'))
        characterLimit = parseInt(document.getElementById('characterLimitCount').textContent);

        $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
            events: {
                load:function(){
                    $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
                      if (wysihtml5Editor.getValue() != "")
                        {
                        var text_split = $('.amenity_directional_text_count').text().split(" ");
                        // jQuery('#amenity_directional_text').text().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace('&nbsp;','').length
                        var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
                        $('.amenity_directional_text_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
                      }
                    });
                    var wysihtml5Editor = $('#amenity_directional_text').data("wysihtml5").editor;
                    var t = wysihtml5Editor.getValue();
                    if(t!= '')
                    {
                      t1 = t.substr(0, characterLimit)
                      t2 = t.substr(characterLimit, t.length)
                      // t2 = t2.fontcolor("red");
                      wysihtml5Editor.setValue(t1 + t2);
                      var text_split = $('.amenity_directional_text_count').text().split(" ")
                      var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
                      $('.amenity_directional_text_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
                    }

                },
                change: function() {
                    $('.amenity_edit_field').change();
                }
            }
        });
    });
    $('[data-toggle="popover"]').popover();
  if ($('.is-home-page')[0]) {
    showTabsAccordingToTheme(selected_theme);
    set_primary_font_changes();
    set_secondary_font_changes();

    var design_page_logo_upload_holder = document.getElementById('design-page-logo-upload-holder');
    if (design_page_logo_upload_holder) {
      design_page_logo_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
            readDesignPageLogoSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

      var design_page_self_tour_logo_upload_holder = document.getElementById('design-page-self-tour-logo-upload-holder');
      if (design_page_self_tour_logo_upload_holder) {
          design_page_self_tour_logo_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
                  readDesignPageSelfTourLogoSrc(files[0]);
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

    var apartment_button_on_image_upload_holder = document.getElementById('apartment-button-on-image-upload-holder');
    if (apartment_button_on_image_upload_holder) {
      apartment_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readApartmentNavButtonOnSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var gallery_button_on_image_upload_holder = document.getElementById('gallery-button-on-image-upload-holder');
    if (gallery_button_on_image_upload_holder) {
      gallery_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readGalleryNavButtonOnSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var neighborhood_button_on_image_upload_holder = document.getElementById('neighborhood-button-on-image-upload-holder');
    if (neighborhood_button_on_image_upload_holder) {
      neighborhood_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readNeighborhoodNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var imagepage_button_on_image_upload_holder = document.getElementById('imagepage-button-on-image-upload-holder');
    if (imagepage_button_on_image_upload_holder) {
      imagepage_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readImagepageNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var imagepage_button_on_image_upload_holder = document.getElementById('imagepage-button-on-image-upload-holder');
    if (imagepage_button_on_image_upload_holder) {
      imagepage_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readImagepageNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var webpage_button_on_image_upload_holder = document.getElementById('webpage-button-on-image-upload-holder');
    if (webpage_button_on_image_upload_holder) {
      webpage_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readWebpageNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }


    var favourite_button_on_image_upload_holder = document.getElementById('favourite-button-on-image-upload-holder');
    if (favourite_button_on_image_upload_holder) {
      favourite_button_on_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readFavouriteNavButtonOnSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var apartment_button_off_image_upload_holder = document.getElementById('apartment-button-off-image-upload-holder');
    if (apartment_button_off_image_upload_holder) {
      apartment_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readApertmentButtonOffImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var gallery_button_off_image_upload_holder = document.getElementById('gallery-button-off-image-upload-holder');
    if (gallery_button_off_image_upload_holder) {
      gallery_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readGalleryButtonOffImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var neighborhood_button_off_image_upload_holder = document.getElementById('neighborhood-button-off-image-upload-holder');
    if (neighborhood_button_off_image_upload_holder) {
      neighborhood_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readNeighborhoodButtonOffImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var imagepage_button_off_image_upload_holder = document.getElementById('imagepage-button-off-image-upload-holder');
    if (imagepage_button_off_image_upload_holder) {
      imagepage_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readImagepageButtonOffImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var webpage_button_off_image_upload_holder = document.getElementById('webpage-button-off-image-upload-holder');
    if (webpage_button_off_image_upload_holder) {
      webpage_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readWebpageButtonOffImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    var favourite_button_off_image_upload_holder = document.getElementById('favourite-button-off-image-upload-holder');
    if (favourite_button_off_image_upload_holder) {
      favourite_button_off_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readfavouriteButtonOffImageSrc(files[0]);

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

    var application_background_image_upload_holder = document.getElementById('application-background-image-upload-holder');
    if (application_background_image_upload_holder) {
      application_background_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readApplicationBackgroundImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    
    //upload apartment nav bg image through drag and drop
    
    var apartment_navigation_bg_image_upload_holder = document.getElementById('apartment-navigation-bg-image-upload-holder');
    if (apartment_navigation_bg_image_upload_holder) {
      apartment_navigation_bg_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readApartmentNavigationBgImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    //upload gallery nav bg image through drag and drop
    
    var gallery_navigation_bg_image_upload_holder = document.getElementById('gallery-navigation-bg-image-upload-holder');
    if (gallery_navigation_bg_image_upload_holder) {
      gallery_navigation_bg_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readGalleryNavigationBgImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    //upload favouries nav bg image through drag and drop
    
    var favourities_navigation_bg_image_upload_holder = document.getElementById('favourities-navigation-bg-image-upload-holder');
    if (favourities_navigation_bg_image_upload_holder) {
      favourities_navigation_bg_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readFavouritiesNavigationBgImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
    //upload additional pages nav bg image through drag and drop
    
    var additional_pages_navigation_bg_image_upload_holder = document.getElementById('additional-pages-navigation-bg-image-upload-holder');
    if (additional_pages_navigation_bg_image_upload_holder) {
      additional_pages_navigation_bg_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             readAdditionalPagesNavigationBgImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }
      var neighborhood_bg_image_upload_holder = document.getElementById('neighborhood-bg-image-upload-holder');
      if (neighborhood_bg_image_upload_holder) {
          neighborhood_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  readNeighborhoodBgImageSrc(files[0]);

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

      var filter_label_image_upload_holder = document.getElementById('filter-label-image-upload-holder');
      if (filter_label_image_upload_holder) {
          filter_label_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  filterLabelImageSrc(files[0]);
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

    var home_page_background_image_upload_holder = document.getElementById('home-page-background-image-upload-holder');
    if (home_page_background_image_upload_holder) {

      home_page_background_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             homePageBackgroundImageSrc(files[0]);

        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

    var gable_home_page_nav_bg_image_upload_holder = document.getElementById('gable-home-page-nav-bg-image-upload-holder');
    if (gable_home_page_nav_bg_image_upload_holder) {

        gable_home_page_nav_bg_image_upload_holder.ondrop = function (e) {
          e.preventDefault();
          files = e.dataTransfer.files;
          if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
               gableHomePageNavBackgroundImageSrc(files[0]);

          } else {
            console.log('file type is not allowed');
            $('#image-upload-warning').modal('show');
          }
        }
    }
      var gable_global_nav_bg_image_upload_holder = document.getElementById('gable-global-nav-bg-image-upload-holder');
      if (gable_global_nav_bg_image_upload_holder) {

          gable_global_nav_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                   gableGlobalNavBackgroundImageSrc(files[0]);

              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }
      var gable_filter_panel_bg_image_upload_holder = document.getElementById('gable-filter-panel-bg-image-upload-holder');
      if (gable_filter_panel_bg_image_upload_holder) {

          gable_filter_panel_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                   gableFilterPanelBackgroundImageSrc(files[0]);

              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }

    var global_nav_background_image_upload_holder = document.getElementById('global-nav-background-image-upload-holder');
    if (global_nav_background_image_upload_holder) {

      global_nav_background_image_upload_holder.ondrop = function (e) {
        e.preventDefault();
        files = e.dataTransfer.files;
        if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
             globalNavBackgroundImageSrc(files[0]);
        } else {
          console.log('file type is not allowed');
          $('#image-upload-warning').modal('show');
        }
      }
    }

      var application_bg_image_upload_holder = document.getElementById('application-bg-image-gables-upload-holder');
      if (application_bg_image_upload_holder) {

          application_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  applicationBgImageGableSrc(files[0]);
              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }
      var apartment_nav_bg_image_upload_holder = document.getElementById('apartment-nav-bg-image-gables-upload-holder');
      if (apartment_nav_bg_image_upload_holder) {

          apartment_nav_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  apartmentNavBgImageGableSrc(files[0]);
              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }
      var gallery_bg_image_upload_holder = document.getElementById('gallery-bg-image-gables-upload-holder');
      if (gallery_bg_image_upload_holder) {

          gallery_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  galleryBgImageGableSrc(files[0]);
              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }
      var favourite_bg_image_upload_holder = document.getElementById('favourite-bg-image-gables-upload-holder');
      if (favourite_bg_image_upload_holder) {

          favourite_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  favouriteBgImageGableSrc(files[0]);
              } else {
                  console.log('file type is not allowed');
                  $('#image-upload-warning').modal('show');
              }
          }
      }
      var additional_pages_bg_image_upload_holder = document.getElementById('additional-pages-bg-image-gables-upload-holder');
      if (additional_pages_bg_image_upload_holder) {

          additional_pages_bg_image_upload_holder.ondrop = function (e) {
              e.preventDefault();
              files = e.dataTransfer.files;
              if (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") {
                  additionalPagesBgImageGableSrc(files[0]);
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


    // hideShowBackgroundColorDiv($('#community_design_attributes_menu_attributes_manage_background'), $('#c-style-background-color '), $('#c-style-background-color-text-field'));
    // $('#community_design_attributes_menu_attributes_manage_background').change(function () {
    //   hideShowBackgroundColorDiv($(this), $('#c-style-background-color '), $('#c-style-background-color-text-field'));
    // });


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
    $('.home-page-image-field').change(function () {
        $('#home-page-image-form').submit();
    });

  $('.map-marker-field').change(function () {
    $('#map-marker-form').submit();
  });

    $('.property-map-marker-field').change(function () {
        $('#property-map-marker-form').submit();
    });
    $('.ebrochure-setting-field').change(function () {
        $('#ebrochure-settings-form').submit();
    });
    $('.ebrochure-setting-field-mordernist').change(function () {
        $('#ebrochure-settings-form-for-mordernist').submit();
    });
    $('.ebrochure-setting-field-for-message').change(function () {
        $('#ebrochure-settings-form-for-message').submit();
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

  $("#zerv-lock-image").change(function () {
    readLockImageSrcFromInput(this, "zerv", $('#zerv-preview-image') );
  });

  $("#latch-lock-image").change(function () {
    readLockImageSrcFromInput(this, "latch", $('#latch-preview-image') );
  });

  $("#dwelo-lock-image").change(function () {
    readLockImageSrcFromInput(this, "dwelo", $('#dwelo-preview-image'), "unit" );
  });

  $("#amenity-dwelo-lock-image").change(function () {
    readLockImageSrcFromInput(this, "dwelo", $('#amenity-dwelo-preview-image'), "amenity" );
  });

  $(".igloohome-lock-image").change(function () {
    readLockImageSrcFromInput(this, "igloohome", $('.igloohome-preview-image') );
  });

  $("#edgestate-lock-image").change(function () {
    readLockImageSrcFromInput(this, "edgestate", $('#edgestate-preview-image') );
  });

  $("#floorplan-additional-image").change(function () {
    readFloorplanAdditionalImageFromInput(this);
  });

  $("#logo").change(function () {
    readDesignPageLogoSrcFromInput(this);
  });

  $("#secondary_logo").change(function () {
    readDesignPageSecondaryLogoSrcFromInput(this);
  });

  $("#self_tour_logo").change(function () {
    readDesignPageSelfTourLogoSrcFromInput(this);
  });

  $("#email_logo").change(function () {
    readEmailLogoSrcFromInput(this);
  });

  $("#secondary_page_background_image ").change(function () {
    readSecondaryBackgroundImageFromInput(this);
  });

  $("#global_nav_button_on").change(function () {
    readGlobalNavButtonOnFromInput(this);
  });

  $("#apartment_btn_on_image").change(function () {
    readApartmentButtonOnFromInput(this);
  });
  $("#gallery_btn_on_image").change(function () {
    readGalleryButtonOnFromInput(this);
  });
  $("#neighborhood_btn_on_image").change(function () {
    readNeighborhoodButtonOnFromInput(this);
  });
  $("#imagepage_btn_on_image").change(function () {
    readImagepageButtonOnFromInput(this);
  });
  $("#webpage_btn_on_image").change(function () {
    readWebpageButtonOnFromInput(this);
  });
  $("#favourite_btn_on_image").change(function () {
    readFavouriteButtonOnFromInput(this);
  });
  $("#apartment_btn_off_image").change(function () {
    readApartmentButtonOffFromInput(this);
  });
  $("#gallery_btn_off_image").change(function () {
    readGalleryButtonOffFromInput(this);
  });
  $("#neighborhood_btn_off_image").change(function () {
    readNeighborhoodButtonOffFromInput(this);
  });
  $("#imagepage_btn_off_image").change(function () {
    readImagepageButtonOffFromInput(this);
  });
  $("#webpage_btn_off_image").change(function () {
    readWebpageButtonOffFromInput(this);
  });

  $("#favourite_btn_off_image").change(function () {
    readFavouriteButtonOffFromInput(this);
  });
  $("#global_nav_button_off").change(function () {
    readGlobalNavButtonOffFromInput(this);
  });

  $("#application_background_image").change(function () {
    readApplicationBackgroundImageFromInput(this);
  });
  
  $("#apartment_nav_bg_image").change(function () {
    readApartmentNavBgImageFromInput(this);
  });
  
  $("#gallery_nav_bg_image").change(function () {
    readGalleryNavBgImageFromInput(this);
  });
  
  $("#favourities_nav_bg_image").change(function () {
    readFavouritiesNavBgImageFromInput(this);
  });
  
  $("#additional_pages_nav_bg_image").change(function () {
    readAdditionalPagesNavBgImageFromInput(this);
  });
    $("#neighborhood_bg_image").change(function () {
        readNeighborhoodBgImageFromInput(this);
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

    $("#filter_label_image").change(function () {
        readFilterlabelImageFromInput(this);
    });

  $("#home_page_button_image").change(function () {
    readHomePageButtonImageFromInput(this);
  });
  $("#home_page_background_image").change(function () {
    readHomePageBackgroundImageFromInput(this);
  });
  $("#home_page_nav_bg_image").change(function () {
      readGlobalHomePageNavBackgroundImageFromInput(this);
  });

    $("#global_nav_bg_image").change(function () {
        readGableGlobalNavBackgroundImageFromInput(this);
    });

    $("#filter_panel_bg_image").change(function () {
        readGableFilterPanelBackgroundImageFromInput(this);
    });
  $("#global_nav_background_image").change(function () {
    readGlobalNavBackgroundImageFromInput(this);
  });
    $("#application_bg_image_gables").change(function () {
        readApplicationBgImageGableFromInput(this);
    });
    $("#apartment_bg_image_gables").change(function () {
        readApartmentNavBgImageGableFromInput(this);
    });
    $("#gallery_bg_image_gables").change(function () {
        readGalleryBgImageGableFromInput(this);
    });
    $("#favourite_bg_image_gables").change(function () {
        readFavouriteBgImageGableFromInput(this);
    });
    $("#additional_pages_bg_image_gables").change(function () {
        readAdditionalPagesBgImageGableFromInput(this);
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
    $('#menu_position_field').change(function () {
        showSelectedMenuPosition();
    });


});

function zervLockIntructionText() {
  let characterLimit = 275;

  $('.zerv_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.zerv_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.zerv_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#zerv_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.zerv_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.zerv_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.zerv_lock_instruction_field').change();
        }
      }
    });
  });
}

function latchLockIntructionText() {
  let characterLimit = 275;

  $('.latch_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.latch_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.latch_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#latch_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.latch_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.latch_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.latch_lock_instruction_field').change();
        }
      }
    });
  });
}

function dweloLockIntructionText() {
  let characterLimit = 275;

  $('.dwelo_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.dwelo_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.dwelo_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#dwelo_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.dwelo_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.dwelo_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.dwelo_lock_instruction_field').change();
        }
      }
    });
  });
}

function amenityDweloLockIntructionText() {
  let characterLimit = 275;

  $('.amenity_dwelo_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.amenity_dwelo_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.amenity_dwelo_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#amenity_dwelo_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.amenity_dwelo_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.amenity_dwelo_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.amenity_dwelo_lock_instruction_field').change();
        }
      }
    });
  });
}

function editElevatorDirectionalTextField () {
  // let characterLimit = 275;

  $('.elevator_directional_text_edit_field_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.elevator_directional_text_edit_field_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.elevator_directional_text_edit_field_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#elevator_directional_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.elevator_directional_text_edit_field_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.elevator_directional_text_edit_field_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.elevator_directional_text_edit_field').change();
        }
      }
    });
  });
}

function editElevatorDescriptionField () {
  let characterLimit = 275;

  $('.elevator_description_edit_field_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.elevator_description_edit_field_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.elevator_description_edit_field_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#elevator_description').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.elevator_description_edit_field_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.elevator_description_edit_field_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.elevator_description_edit_field').change();
        }
      }
    });
  });
}

function igloohomeLockIntructionText() {
  let characterLimit = 275;

  $('.igloohome_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.igloohome_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.igloohome_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#igloohome_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.igloohome_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.igloohome_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.igloohome_lock_instruction_field').change();
        }
      }
    });
  });
}

function edgestateLockIntructionText() {
  let characterLimit = 275;

  $('.edgestate_lock_instruction_wysihtml5').each(function(i, elem) {
    $(elem).wysihtml5({'toolbar': {'image': false,'link' : false, 'emphasis' : false},
      events: {
        load:function(){
          $('.wysihtml5-sandbox').contents().find('body').on("keydown",function(event) {
            if (wysihtml5Editor.getValue() != "")
            {
              var text_split = $('.edgestate_lock_instruction_count').text().split(" ")
              var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
              $('.edgestate_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
            }
          });

          var wysihtml5Editor = $('#edgestate_lock_instruction_text').data("wysihtml5").editor;
          var t = wysihtml5Editor.getValue();
            
          if(t!= '') {
            t1 = t.substr(0, characterLimit)
            t2 = t.substr(characterLimit, t.length)
            // t2 = t2.fontcolor("red");
            wysihtml5Editor.setValue(t1 + t2);
            var text_split = $('.edgestate_lock_instruction_count').text().split(" ")
            var total_length = wysihtml5Editor.getValue().replace(/<(?:.|\n)*?>/gm, '').replace(/(\r\n|\n|\r)/gm,"").replace(/\&nbsp;/g, '').length
            $('.edgestate_lock_instruction_count').text( text_split[0] + " " + text_split[1] + " " + (characterLimit - total_length)).toString()
          }
        },

        change: function() {
          $('.edgestate_lock_instruction_field').change();
        }
      }
    });
  });
}

function uploadZervLockImage() {
  var lockUploadHolder = document.getElementById('zerv-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readLockImageSrc(files[0], "zerv", $('#zerv-preview-image') );
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function uploadLatchLockImage() {
  var lockUploadHolder = document.getElementById('latch-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readLockImageSrc(files[0], "latch", $('#latch-preview-image') );
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function uploadDweloLockImage() {
  var lockUploadHolder = document.getElementById('dwelo-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readLockImageSrc(files[0], "dwelo", $('#dwelo-preview-image'), "unit" );
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function uploadAmenityDweloLockImage() {
  var lockUploadHolder = document.getElementById('amenity-dwelo-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readLockImageSrc(files[0], "dwelo", $('#amenity-dwelo-preview-image'), "amenity" );
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function uploadIgloohomeLockImage() {
  var lockUploadHolder = $('.igloohome-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.on('drop', function(e) {
      e.preventDefault();
      var files = e.originalEvent.dataTransfer.files;
      if (files.length > 0 && (files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg")) {
        readLockImageSrc(files[0], "igloohome", $('.igloohome-preview-image'));
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    });
  }
}

function uploadEdgestateLockImage() {
  var lockUploadHolder = document.getElementById('edgestate-lock-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readLockImageSrc(files[0], "edgestate", $('#edgestate-preview-image') );
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function updloadFloorplanAdditionalImage() {
  var lockUploadHolder = document.getElementById('floorplan-additional-image-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readFloorplanAdditionalImageSrc(files[0]);
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function uploadEmailLogo() {
  var lockUploadHolder = document.getElementById('email-logo-upload-holder');
  if (lockUploadHolder) {
    lockUploadHolder.ondrop = function (e) {
      e.preventDefault();
      files = e.dataTransfer.files;
      if ((files[0].type == "image/png" || files[0].type == "image/jpeg" || files[0].type == "image/jpg") ){
          readEmailLogoSrc(files[0]);
      } else {
        console.log('file type is not allowed');
        $('#image-upload-warning').modal('show');
      }
    }
  }
}

function showSelectedMenuPosition() {
  if ($('#menu_position_field').val() == "Horizontal") {
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
  $("#primary-font-text").css({"font-family": $(".primary_font_family option:selected").text(), "color": $('.primary_font_color').val(), "font-size": $('.primary_font_size').val(), "font-weight": $('.primary_font_weight').val(), "text-align": $('.primary_text_align').val()});
}

function set_secondary_font_changes() {
  $("#secondary-font-text").css({"font-family": $(".secondary_font_family option:selected").text(), "color": $('.secondary_font_color').val(), "font-size": $('.secondary_font_size').val(), "font-weight": $('.secondary_font_weight').val(), "text-align": $('.secondary_text_align').val()});
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

function readFloorplanAdditionalImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#floorplan-additional-preview-image').attr('src', e.target.result);
    $('#floorplan-additional-preview-image').parent().attr('href', e.target.result);

    floorplanAdditionalImageUploader(e.target.result);
  }

  reader.readAsDataURL(file);
}

function readEmailLogoSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#email-logo-preview-image').attr('src', e.target.result);
    $('#email-logo-preview-image').parent().attr('href', e.target.result);

    emailLogoUploader(e.target.result);
  }

  reader.readAsDataURL(file);
}

function readLockImageSrc(file, lockType, element, type) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
    element.attr('src', e.target.result);
    element.parent().attr('href', e.target.result);

    LockImageUploader(e.target.result, lockType, type);
  }

  reader.readAsDataURL(file);
}

function readDesignPageSelfTourLogoSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
        $('#preview-image-self-tour').attr('src', e.target.result);
        $('#preview-image-self-tour').parent().attr('href', e.target.result);
        designPageSelfTourLogo(e.target.result);
    }
    reader.readAsDataURL(file);
}


function readDesignPageSecondaryLogoSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_secondary_logo").removeClass("hidden");
        }
        else
        {
            $(".exal_secondary_logo").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#preview-image-secondary').attr('src', e.target.result);
    $('#preview-image-secondary').parent().attr('href', e.target.result);
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
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_global_nav_button_on").removeClass("hidden");
        }
        else
        {
            $(".exal_global_nav_button_on").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#global-nav-button-on-preview-image').attr('src', e.target.result);
    $('#global-nav-button-on-preview-image').parent().attr('href', e.target.result);
    globalNavButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readApartmentNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_apartment_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_apartment_btn_on_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#apartment-button-on-preview-image').attr('src', e.target.result);
    $('#apartment-button-on-preview-image').parent().attr('href', e.target.result);
    apartmentButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readGalleryNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_gallery_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_gallery_btn_on_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#gallery-button-on-preview-image').attr('src', e.target.result);
    $('#gallery-button-on-preview-image').parent().attr('href', e.target.result);
    galleryButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readNeighborhoodNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_neighborhood_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_neighborhood_btn_on_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#neighborhood-button-on-preview-image').attr('src', e.target.result);
    $('#neighborhood-button-on-preview-image').parent().attr('href', e.target.result);
    neighborhoodButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readImagepageNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_imagepage_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_imagepage_btn_on_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#imagepage-button-on-preview-image').attr('src', e.target.result);
    $('#imagepage-button-on-preview-image').parent().attr('href', e.target.result);
    imagepageButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readWebpageNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_webpage_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_webpage_btn_on_image").addClass("hidden");
        }
    };

    reader.onload = function (e) {
    $('#webpage-button-on-preview-image').attr('src', e.target.result);
    $('#webpage-button-on-preview-image').parent().attr('href', e.target.result);
    webpageButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readFavouriteNavButtonOnSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_favourite_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_favourite_btn_on_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#favourite-button-on-preview-image').attr('src', e.target.result);
    $('#favourite-button-on-preview-image').parent().attr('href', e.target.result);
    favouriteButtonOnImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readApertmentButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_apartment_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_apartment_btn_off_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#apartment-button-off-preview-image').attr('src', e.target.result);
    $('#apartment-button-off-preview-image').parent().attr('href', e.target.result);
    apartmentButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readGalleryButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_gallery_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_gallery_btn_off_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#gallery-button-off-preview-image').attr('src', e.target.result);
    $('#gallery-button-off-preview-image').parent().attr('href', e.target.result);
    galleryButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readNeighborhoodButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_neighborhood_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_neighborhood_btn_off_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#neighborhood-button-off-preview-image').attr('src', e.target.result);
    $('#neighborhood-button-off-preview-image').parent().attr('href', e.target.result);
    neighborhoodButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readImagepageButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_imagepage_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_imagepage_btn_off_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#imagepage-button-off-preview-image').attr('src', e.target.result);
    $('#imagepage-button-off-preview-image').parent().attr('href', e.target.result);
    imagepageButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readWebpageButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_webpage_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_webpage_btn_off_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#webpage-button-off-preview-image').attr('src', e.target.result);
    $('#webpage-button-off-preview-image').parent().attr('href', e.target.result);
    webpageButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readfavouriteButtonOffImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_favourite_btn_off_image").removeClass("hidden");
        }
        else
        {
            $(".exal_favourite_btn_off_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#favourite-button-off-preview-image').attr('src', e.target.result);
    $('#favourite-button-off-preview-image').parent().attr('href', e.target.result);
    favouriteButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readGlobalNavButtonOffSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_global_nav_button_off").removeClass("hidden");
        }
        else
        {
            $(".exal_global_nav_button_off").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#global-nav-button-off-preview-image').attr('src', e.target.result);
    $('#global-nav-button-off-preview-image').parent().attr('href', e.target.result);
    globalNavButtonOffImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readApplicationBackgroundImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
  reader.onload = function (e) {
      var img = getHeightWidthLimit(file);
      img.onload = function () {
          if (this.width < image_width && this.height < image_height)
          {
              $(".exal_application_background_image").removeClass("hidden");
          }
          else
          {
              $(".exal_application_background_image").addClass("hidden");
          }
      };
    $('#application-background-preview-image').attr('src', e.target.result);
    $('#application-background-preview-image').parent().attr('href', e.target.result);
    applicationBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function readApartmentNavigationBgImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_apartment_nav_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_apartment_nav_bg_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#apartment-navigation-bg-image-preview').attr('src', e.target.result);
    $('#apartment-navigation-bg-image-preview').parent().attr('href', e.target.result);
    apartmentNavigationBgImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readGalleryNavigationBgImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_apartment_btn_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_apartment_btn_on_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#gallery-navigation-bg-image-preview').attr('src', e.target.result);
    $('#gallery-navigation-bg-image-preview').parent().attr('href', e.target.result);
    galleryNavigationBgImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readFavouritiesNavigationBgImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_favourities_nav_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_favourities_nav_bg_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#favourities-navigation-bg-image-preview').attr('src', e.target.result);
    $('#favourities-navigation-bg-image-preview').parent().attr('href', e.target.result);
    apartmentFavouritiesBgImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readAdditionalPagesNavigationBgImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_additional_pages_nav_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_additional_pages_nav_bg_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#additional-pages-navigation-bg-image-preview').attr('src', e.target.result);
    $('#additional-pages-navigation-bg-image-preview').parent().attr('href', e.target.result);
    apartmentAdditionalPagesBgImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function readNeighborhoodBgImageSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_filter_label_image").removeClass("hidden");
        }
        else
        {
            $(".exal_filter_label_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#neighborhood-bg-image-preview').attr('src', e.target.result);
        $('#neighborhood-bg-image-preview').parent().attr('href', e.target.result);
        neighborhoodBgImage(e.target.result);
    }
    reader.readAsDataURL(file);
}

function filterButtonSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_filter_button").removeClass("hidden");
        }
        else
        {
            $(".exal_filter_button").addClass("hidden");
        }
    };
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
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_gallery_button").removeClass("hidden");
        }
        else
        {
            $(".exal_gallery_button").addClass("hidden");
        }
    };
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
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_filter_panel_background_image").removeClass("hidden");
        }
        else
        {
            $(".exal_filter_panel_background_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#filter-panel-background-preview-image').attr('src', e.target.result);
        $('#filter-panel-background-preview-image').parent().attr('href', e.target.result);
        filterPanelBackgroundImage(e.target.result);
    }
    reader.readAsDataURL(file);
}
function filterLabelImageSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_filter_label_image").removeClass("hidden");
        }
        else
        {
            $(".exal_filter_label_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#filter-label-image-preview').attr('src', e.target.result);
        $('#filter-label-image-preview').parent().attr('href', e.target.result);
        filterLabelImage(e.target.result);
    }
    reader.readAsDataURL(file);
}

function homePageButtonImageSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_home_page_button_image").removeClass("hidden");
        }
        else
        {
            $(".exal_home_page_button_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#home-page-button-image-preview').attr('src', e.target.result);
    $('#home-page-button-image-preview').parent().attr('href', e.target.result);
    homePageButtonImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function homePageBackgroundImageSrc(file) {
  $(".divLoading").removeClass("hidden");
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_home_page_background_image").removeClass("hidden");
        }
        else
        {
            $(".exal_home_page_background_image").addClass("hidden");
        }
    };
  var reader = new FileReader();
  reader.onload = function (e) {
    $('#home-page-background-image-preview').attr('src', e.target.result);
    $('#home-page-background-image-preview').parent().attr('href', e.target.result);
    homePageBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}

function gableHomePageNavBackgroundImageSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_home_page_nav_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_home_page_nav_bg_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#gable-home-page-nav-bg-image-preview').attr('src', e.target.result);
        $('#gable-home-page-nav-bg-image-preview').parent().attr('href', e.target.result);
        globalHomePageNavBackgroundImage(e.target.result);
    }
    reader.readAsDataURL(file);
}
function gableGlobalNavBackgroundImageSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_global_nav_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_global_nav_bg_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#gable-global-nav-bg-image-preview').attr('src', e.target.result);
        $('#gable-global-nav-bg-image-preview').parent().attr('href', e.target.result);
        gableGlobalNavBackgroundImage(e.target.result);
    }
    reader.readAsDataURL(file);
}
function gableFilterPanelBackgroundImageSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_filter_panel_bg_image").removeClass("hidden");
        }
        else
        {
            $(".exal_filter_panel_bg_image").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#gable-filter-panel-bg-image-preview').attr('src', e.target.result);
        $('#gable-filter-panel-bg-image-preview').parent().attr('href', e.target.result);
        gableFilterPanelBackgroundImage(e.target.result);
    }
    reader.readAsDataURL(file);
}
function globalNavBackgroundImageSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_global_nav_background_image").removeClass("hidden");
        }
        else
        {
            $(".exal_global_nav_background_image").addClass("hidden");
        }
    };
  reader.onload = function (e) {
    $('#global-nav-background-image-preview').attr('src', e.target.result);
    $('#global-nav-background-image-preview').parent().attr('href', e.target.result);
    globalNavBackgroundImage(e.target.result);
  }
  reader.readAsDataURL(file);
}
function applicationBgImageGableSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    reader.onload = function (e) {
        var img = getHeightWidthLimit(file);
        img.onload = function () {
            if (this.width < image_width && this.height < image_height)
            {
                $(".exal_application_bg_image_gables").removeClass("hidden");
            }
            else
            {
                $(".exal_application_bg_image_gables").addClass("hidden");
            }
        };
        $('#application-bg-image-gables-preview-image').attr('src', e.target.result);
        $('#application-bg-image-gables-preview-image').parent().attr('href', e.target.result);
        applicationBgImageGables(e.target.result);
    }
    reader.readAsDataURL(file);
}
function apartmentNavBgImageGableSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_apartment_bg_image_gables").removeClass("hidden");
        }
        else
        {
            $(".exal_apartment_bg_image_gables").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#apartment-nav-bg-image-gables-preview-image').attr('src', e.target.result);
        $('#apartment-nav-bg-image-gables-preview-image').parent().attr('href', e.target.result);
        apartmentNavBgImageGables(e.target.result);
    }
    reader.readAsDataURL(file);
}
function galleryBgImageGableSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_gallery_bg_image_gables").removeClass("hidden");
        }
        else
        {
            $(".exal_gallery_bg_image_gables").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#gallery-bg-image-gables-preview-image').attr('src', e.target.result);
        $('#gallery-bg-image-gables-preview-image').parent().attr('href', e.target.result);
        galleryBgImageGables(e.target.result);
    }
    reader.readAsDataURL(file);
}
function favouriteBgImageGableSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_favourite_bg_image_gables").removeClass("hidden");
        }
        else
        {
            $(".exal_favourite_bg_image_gables").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#favourite-bg-image-gables-preview-image').attr('src', e.target.result);
        $('#favourite-bg-image-gables-preview-image').parent().attr('href', e.target.result);
        favouriteBgImageGables(e.target.result);
    }
    reader.readAsDataURL(file);
}
function additionalPagesBgImageGableSrc(file) {
    $(".divLoading").removeClass("hidden");
    var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_additional_pages_bg_image_gables").removeClass("hidden");
        }
        else
        {
            $(".exal_additional_pages_bg_image_gables").addClass("hidden");
        }
    };
    reader.onload = function (e) {
        $('#additional-pages-bg-image-gables-preview-image').attr('src', e.target.result);
        $('#additional-pages-bg-image-gables-preview-image').parent().attr('href', e.target.result);
        additionalPagesBgImageGables(e.target.result);
    }
    reader.readAsDataURL(file);
}
function galleryImageOnSrc(file) {
  $(".divLoading").removeClass("hidden");
  var reader = new FileReader();
    var img = getHeightWidthLimit(file);
    img.onload = function () {
        if (this.width < image_width && this.height < image_height)
        {
            $(".exal_gallery_button_on_image").removeClass("hidden");
        }
        else
        {
            $(".exal_gallery_button_on_image").addClass("hidden");
        }
    };
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

function getLockImageURL(lockType, communityId) {
  switch(lockType) {
    case 'zerv':
      return `/communities/${communityId}/zerv_accounts/upload_lock_image`;
    case 'latch':
      return `/communities/${communityId}/latch_accounts/upload_lock_image`;
    case 'dwelo':
      return `/communities/${communityId}/dwelos/upload_lock_image`;
    case 'igloohome':
      return `/communities/${communityId}/igloohome_accounts/upload_lock_image`;
    case 'edgestate':
      return `/communities/${communityId}/edgestate_accounts/upload_lock_image`;
  }
}


function LockImageUploader(src, lockType, type) {
  let lockData = $("#communityLock").data();
  let community_id = lockData.communityId;
  $(".divLoading").removeClass("hidden"); 
  let payload;

  if(type === "amenity") {
    payload =  {amenity_lock_image: src, type: "amenity"}
  } else {
    payload =  {lock_image: src, type: "unit"}
  }

  $.ajax({
    url: getLockImageURL(lockType, community_id),
    type: "PUT",
    dataType: "script",
    data: payload
  }).done(function () {
    $(".divLoading").addClass("hidden");
  });
}

function floorplanAdditionalImageUploader(src) {
  var url = `/communities/${community_id}/floorplans/${floorplan_id}/amenities/${amenity_id}/upload_floorplan_amenity_image`;

  if( community_id && floorplan_id && amenity_id) {
    $.ajax({
      url: url,
      type: "PUT",
      dataType: "script",
      data: {src: src}
    }).done(function () {
      location.reload();
    });
  }
}

function emailLogoUploader(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
      url: url,
      type: "PUT",
      dataType: "script",
      data: {
          community: {email_logo: src}
      }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function designPageSelfTourLogo(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {self_tour_logo: src}
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

function apartmentButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, apartment_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function galleryButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, gallery_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function neighborhoodButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, neighborhood_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function imagepageButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, imagepage_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function webpageButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, webpage_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function favouriteButtonOnImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, favourite_btn_on_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function apartmentButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, apartment_btn_off_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function galleryButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, gallery_btn_off_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function neighborhoodButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, neighborhood_btn_off_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function imagepageButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, imagepage_btn_off_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function webpageButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, webpage_btn_off_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function favouriteButtonOffImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, favourite_btn_off_image: src}}}
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

function applicationBackgroundImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, application_background_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function apartmentNavigationBgImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, apartment_nav_bg_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function galleryNavigationBgImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, gallery_nav_bg_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function apartmentFavouritiesBgImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, favourities_nav_bg_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}

function apartmentAdditionalPagesBgImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, additional_pages_nav_bg_image: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function neighborhoodBgImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, neighborhood_bg_image: src}}}
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
function filterLabelImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, filter_label_image: src}}
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

function homePageBackgroundImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, home_page_background_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function globalHomePageNavBackgroundImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, home_page_nav_bg_image: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function gableGlobalNavBackgroundImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, global_nav_bg_image: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function gableFilterPanelBackgroundImage(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, filter_panel_bg_image: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}

function globalNavBackgroundImage(src) {
  $(".divLoading").removeClass("hidden");
  var url = "/communities/" + community_id;
  $.ajax({
    url: url,
    type: "PUT",
    dataType: "script",
    data: {
      community: {design_attributes: {id: design_id, expressionist_attributes: {id: expressionist_id, global_nav_background_image: src}}}
    }
  }).done(function () {
    $(".divLoading").addClass("hidden");
    console.log("success");
  });
}
function applicationBgImageGables(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, application_bg_image_gables: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function apartmentNavBgImageGables(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, apartment_bg_image_gables: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function galleryBgImageGables(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, gallery_bg_image_gables: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function favouriteBgImageGables(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, favourite_bg_image_gables: src}}}
        }
    }).done(function () {
        $(".divLoading").addClass("hidden");
        console.log("success");
    });
}
function additionalPagesBgImageGables(src) {
    $(".divLoading").removeClass("hidden");
    var url = "/communities/" + community_id;
    $.ajax({
        url: url,
        type: "PUT",
        dataType: "script",
        data: {
            community: {design_attributes: {id: design_id, gable_attributes: {id: gable_id, additional_pages_bg_image_gables: src}}}
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

function readLockImageSrcFromInput(input, lockType, element, type) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
        element.attr('src', e.target.result);
        element.parent().attr('href', e.target.result);
        LockImageUploader(e.target.result, lockType, type);
      }

      reader.readAsDataURL(input.files[0]);
      var img = getHeightWidthLimit(input);
      
      img.onload = function () {
        if (this.width < image_height && this.height < image_width) {
          $(".waring_exal").removeClass("hidden");
        }
        else {
          $(".waring_exal").addClass("hidden");
        }
      };
    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
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
            var img = getHeightWidthLimit(input);
            img.onload = function () {
                if (this.width < image_height && this.height < image_width)
                {
                    $(".waring_exal").removeClass("hidden");
                }
                else
                {
                    $(".waring_exal").addClass("hidden");
                }
            };

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}

function readFloorplanAdditionalImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
        var reader = new FileReader();

        reader.onload = function (e) {
          $('#floorplan-additional-preview-image').attr('src', e.target.result);
          $('#floorplan-additional-preview-image').parent().attr('href', e.target.result);
          floorplanAdditionalImageUploader(e.target.result);
        }

        reader.readAsDataURL(input.files[0]);
        var img = getHeightWidthLimit(input);

        img.onload = function () {
          if (this.width < image_height && this.height < image_width)
            $(".waring_exal").removeClass("hidden");
          else
            $(".waring_exal").addClass("hidden");
        };

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
    }
  }
}

function readEmailLogoSrcFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
      var reader = new FileReader();

      reader.onload = function (e) {
          var img = getHeightWidthLimit(input);
          img.onload = function () {
              if (this.width < image_width && this.height < image_height)
              {
                $(".exal_email_logo").removeClass("hidden");
              }
              else
              {
                $(".exal_email_logo").addClass("hidden");
              }
          };
          $('#email-logo-preview-image').attr('src', e.target.result);
          $('#email-logo-preview-image').parent().attr('href', e.target.result);
          emailLogoUploader(e.target.result);
      }

      reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
    }
  }
}

function readDesignPageSelfTourLogoSrcFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                $('#preview-image-self-tour').attr('src', e.target.result);
                $('#preview-image-self-tour').parent().attr('href', e.target.result);
                designPageSelfTourLogo(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);
            var img = getHeightWidthLimit(input);
            img.onload = function () {
                if (this.width < image_height && this.height < image_width)
                {
                    $(".waring_exal").removeClass("hidden");
                }
                else
                {
                    $(".waring_exal").addClass("hidden");
                }
            };

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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_secondary_logo").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_secondary_logo").addClass("hidden");
                    }
                };
                $('#preview-image-secondary').attr('src', e.target.result);
                $('#preview-image-secondary').parent().attr('href', e.target.result);
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
          var img = getHeightWidthLimit(input);
          img.onload = function () {
              if (this.width < image_width && this.height < image_height)
              {
                  $(".exal_global_nav_button_on").removeClass("hidden");
              }
              else
              {
                  $(".exal_global_nav_button_on").addClass("hidden");
              }
          };
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

function readApartmentButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_apartment_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_apartment_btn_on_image").addClass("hidden");
                    }
                };
                $('#apartment-button-on-preview-image').attr('src', e.target.result);
                $('#apartment-button-on-preview-image').parent().attr('href', e.target.result);
                apartmentButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readGalleryButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();


            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_gallery_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_gallery_btn_on_image").addClass("hidden");
                    }
                };
                $('#gallery-button-on-preview-image').attr('src', e.target.result);
                $('#gallery-button-on-preview-image').parent().attr('href', e.target.result);
                galleryButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readNeighborhoodButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();


            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_neighborhood_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_neighborhood_btn_on_image").addClass("hidden");
                    }
                };
                $('#neighborhood-button-on-preview-image').attr('src', e.target.result);
                $('#neighborhood-button-on-preview-image').parent().attr('href', e.target.result);
                neighborhoodButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readImagepageButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_imagepage_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_imagepage_btn_on_image").addClass("hidden");
                    }
                };
                $('#imagepage-button-on-preview-image').attr('src', e.target.result);
                $('#imagepage-button-on-preview-image').parent().attr('href', e.target.result);
                imagepageButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readWebpageButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_webpage_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_webpage_btn_on_image").addClass("hidden");
                    }
                };
                $('#webpage-button-on-preview-image').attr('src', e.target.result);
                $('#webpage-button-on-preview-image').parent().attr('href', e.target.result);
                webpageButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readFavouriteButtonOnFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();


        reader.onload = function (e) {
            var img = getHeightWidthLimit(input);
            img.onload = function () {
                if (this.width < image_width && this.height < image_height)
                {
                    $(".exal_favourite_btn_on_image").removeClass("hidden");
                }
                else
                {
                    $(".exal_favourite_btn_on_image").addClass("hidden");
                }
            };
                $('#favourite-button-on-preview-image').attr('src', e.target.result);
                $('#favourite-button-on-preview-image').parent().attr('href', e.target.result);
                favouriteButtonOnImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readApartmentButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_apartment_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_apartment_btn_off_image").addClass("hidden");
                    }
                };
                $('#apartment-button-off-preview-image').attr('src', e.target.result);
                $('#apartment-button-off-preview-image').parent().attr('href', e.target.result);
                apartmentButtonOffImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readGalleryButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();


            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_gallery_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_gallery_btn_off_image").addClass("hidden");
                    }
                };
                $('#gallery-button-off-preview-image').attr('src', e.target.result);
                $('#gallery-button-off-preview-image').parent().attr('href', e.target.result);
                galleryButtonOffImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readNeighborhoodButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_neighborhood_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_neighborhood_btn_off_image").addClass("hidden");
                    }
                };
                $('#neighborhood-button-off-preview-image').attr('src', e.target.result);
                $('#neighborhood-button-off-preview-image').parent().attr('href', e.target.result);
                neighborhoodButtonOffImage(e.target.result);
            }
            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readImagepageButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_imagepage_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_imagepage_btn_off_image").addClass("hidden");
                    }
                };
                $('#imagepage-button-off-preview-image').attr('src', e.target.result);
                $('#imagepage-button-off-preview-image').parent().attr('href', e.target.result);
                imagepageButtonOffImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);


    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readWebpageButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_webpage_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_webpage_btn_off_image").addClass("hidden");
                    }
                };
                $('#webpage-button-off-preview-image').attr('src', e.target.result);
                $('#webpage-button-off-preview-image').parent().attr('href', e.target.result);
                webpageButtonOffImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readFavouriteButtonOffFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_favourite_btn_off_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_favourite_btn_off_image").addClass("hidden");
                    }
                };
                $('#favourite-button-off-preview-image').attr('src', e.target.result);
                $('#favourite-button-off-preview-image').parent().attr('href', e.target.result);
                favouriteButtonOffImage(e.target.result);
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_global_nav_button_off").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_global_nav_button_off").addClass("hidden");
                    }
                };
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

function readApplicationBackgroundImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_application_background_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_application_background_image").addClass("hidden");
                    }
                };
                $('#application-background-preview-image').attr('src', e.target.result);
                $('#application-background-preview-image').parent().attr('href', e.target.result);
                applicationBackgroundImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readApartmentNavBgImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_apartment_nav_bg_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_apartment_nav_bg_image").addClass("hidden");
                    }
                };
                $('#apartment-navigation-bg-image-preview').attr('src', e.target.result);
                $('#apartment-navigation-bg-image-preview').parent().attr('href', e.target.result);
                apartmentNavigationBgImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readGalleryNavBgImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_apartment_btn_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_apartment_btn_on_image").addClass("hidden");
                    }
                };
                $('#gallery-navigation-bg-image-preview').attr('src', e.target.result);
                $('#gallery-navigation-bg-image-preview').parent().attr('href', e.target.result);
                galleryNavigationBgImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readFavouritiesNavBgImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_favourities_nav_bg_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_favourities_nav_bg_image").addClass("hidden");
                    }
                };
                $('#favourities-navigation-bg-image-preview').attr('src', e.target.result);
                $('#favourities-navigation-bg-image-preview').parent().attr('href', e.target.result);
                apartmentFavouritiesBgImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readAdditionalPagesNavBgImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_additional_pages_nav_bg_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_additional_pages_nav_bg_image").addClass("hidden");
                    }
                };
                $('#additional-pages-navigation-bg-image-preview').attr('src', e.target.result);
                $('#additional-pages-navigation-bg-image-preview').parent().attr('href', e.target.result);
                apartmentAdditionalPagesBgImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readNeighborhoodBgImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_neighborhood_bg_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_neighborhood_bg_image").addClass("hidden");
                    }
                };
                $('#neighborhood-bg-image-preview').attr('src', e.target.result);
                $('#neighborhood-bg-image-preview').parent().attr('href', e.target.result);
                neighborhoodBgImage(e.target.result);
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_filter_button").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_filter_button").addClass("hidden");
                    }
                };
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_gallery_button").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_gallery_button").addClass("hidden");
                    }
                };
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_filter_panel_background_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_filter_panel_background_image").addClass("hidden");
                    }
                };
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
function readFilterlabelImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_filter_label_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_filter_label_image").addClass("hidden");
                    }
                };
                $('#filter-label-image-preview').attr('src', e.target.result);
                $('#filter-label-image-preview').parent().attr('href', e.target.result);
                filterLabelImage(e.target.result);
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_home_page_button_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_home_page_button_image").addClass("hidden");
                    }
                };
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
function readHomePageBackgroundImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();
            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_home_page_background_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_home_page_background_image").addClass("hidden");
                    }
                };
                $('#home-page-background-image-preview').attr('src', e.target.result);
                $('#home-page-background-image-preview').parent().attr('href', e.target.result);
                homePageBackgroundImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}

function readGlobalHomePageNavBackgroundImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
                var reader = new FileReader();

                reader.onload = function (e) {
                    var img = getHeightWidthLimit(input);
                    img.onload = function () {
                        if (this.width < image_width && this.height < image_height)
                        {
                            $(".exal_home_page_nav_bg_image").removeClass("hidden");
                        }
                        else
                        {
                            $(".exal_home_page_nav_bg_image").addClass("hidden");
                        }
                    };
                    $('#gable-home-page-nav-bg-image-preview').attr('src', e.target.result);
                    $('#gable-home-page-nav-bg-image-preview').parent().attr('href', e.target.result);
                    globalHomePageNavBackgroundImage(e.target.result);
                }

                reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}

function readGableGlobalNavBackgroundImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
                var reader = new FileReader();

                reader.onload = function (e) {
                    var img = getHeightWidthLimit(input);
                    img.onload = function () {
                        if (this.width < image_width && this.height < image_height)
                        {
                            $(".exal_global_nav_bg_image").removeClass("hidden");
                        }
                        else
                        {
                            $(".exal_global_nav_bg_image").addClass("hidden");
                        }
                    };
                    $('#gable-global-nav-bg-image-preview').attr('src', e.target.result);
                    $('#gable-global-nav-bg-image-preview').parent().attr('href', e.target.result);
                    gableGlobalNavBackgroundImage(e.target.result);
                }

                reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}

function readGableFilterPanelBackgroundImageFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
                var reader = new FileReader();

                reader.onload = function (e) {
                    var img = getHeightWidthLimit(input);
                    img.onload = function () {
                        if (this.width < image_width && this.height < image_height)
                        {
                            $(".exal_filter_panel_bg_image").removeClass("hidden");
                        }
                        else
                        {
                            $(".exal_filter_panel_bg_image").addClass("hidden");
                        }
                    };
                    $('#gable-filter-panel-bg-image-preview').attr('src', e.target.result);
                    $('#gable-filter-panel-bg-image-preview').parent().attr('href', e.target.result);
                    gableFilterPanelBackgroundImage(e.target.result);
                }

                reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readGlobalNavBackgroundImageFromInput(input) {
  if (input.files && input.files[0]) {
    if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_global_nav_background_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_global_nav_background_image").addClass("hidden");
                    }
                };
                $('#global-nav-background-image-preview').attr('src', e.target.result);
                $('#global-nav-background-image-preview').parent().attr('href', e.target.result);
                globalNavBackgroundImage(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

    } else {
      $(input).val('');
      $('#image-upload-warning').modal('show');
      //console.log($(input).val());
    }
  }
}
function readApplicationBgImageGableFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_application_bg_image_gables").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_application_bg_image_gables").addClass("hidden");
                    }
                };
                $('#application-bg-image-gables-preview-image').attr('src', e.target.result);
                $('#application-bg-image-gables-preview-image').parent().attr('href', e.target.result);
                applicationBgImageGables(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readApartmentNavBgImageGableFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_apartment_bg_image_gables").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_apartment_bg_image_gables").addClass("hidden");
                    }
                };
                $('#apartment-nav-bg-image-gables-preview-image').attr('src', e.target.result);
                $('#apartment-nav-bg-image-gables-preview-image').parent().attr('href', e.target.result);
                apartmentNavBgImageGables(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readGalleryBgImageGableFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_gallery_bg_image_gables").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_gallery_bg_image_gables").addClass("hidden");
                    }
                };
                $('#gallery-bg-image-gables-preview-image').attr('src', e.target.result);
                $('#gallery-bg-image-gables-preview-image').parent().attr('href', e.target.result);
                galleryBgImageGables(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readFavouriteBgImageGableFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_favourite_bg_image_gables").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_favourite_bg_image_gables").addClass("hidden");
                    }
                };
                $('#favourite-bg-image-gables-preview-image').attr('src', e.target.result);
                $('#favourite-bg-image-gables-preview-image').parent().attr('href', e.target.result);
                favouriteBgImageGables(e.target.result);
            }

            reader.readAsDataURL(input.files[0]);

        } else {
            $(input).val('');
            $('#image-upload-warning').modal('show');
            //console.log($(input).val());
        }
    }
}
function readAdditionalPagesBgImageGableFromInput(input) {
    if (input.files && input.files[0]) {
        if (input.files[0].type == "image/png" || input.files[0].type == "image/jpeg" || input.files[0].type == "image/jpg") {
            var reader = new FileReader();

            reader.onload = function (e) {
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_additional_pages_bg_image_gables").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_additional_pages_bg_image_gables").addClass("hidden");
                    }
                };
                $('#additional-pages-bg-image-gables-preview-image').attr('src', e.target.result);
                $('#additional-pages-bg-image-gables-preview-image').parent().attr('href', e.target.result);
                additionalPagesBgImageGables(e.target.result);
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
                var img = getHeightWidthLimit(input);
                img.onload = function () {
                    if (this.width < image_width && this.height < image_height)
                    {
                        $(".exal_gallery_button_on_image").removeClass("hidden");
                    }
                    else
                    {
                        $(".exal_gallery_button_on_image").addClass("hidden");
                    }
                };
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
  window.current_theme = theme;
  // if (theme == 'modernist') {
  //   $('#font-tab').parent().removeClass('hidden');
  //   $('#menu-tab').parent().removeClass('hidden');
  //   //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
  //   //$('#overlay-tab').parent().addClass('hidden');
  //     $('#global-navigation-tab').parent().addClass('hidden');
  //     $('#filter-panel-tab').parent().addClass('hidden');
  //     $('#home-page-tab').parent().addClass('hidden');
  //     $('#map-marker-tab').parent().addClass('hidden');
  //     $('#floorplan-unit-popup-tab').parent().addClass('hidden');
  //   $('#gables-tab').parent().addClass('hidden');
  // }
  // if (theme == 'expressionist') {
  //   $('#font-tab').parent().addClass('hidden');
  //   $('#menu-tab').parent().addClass('hidden');
  //   //$('#custom-style-tab').parent().parent().parent().removeClass('hidden');
  //   //$('#overlay-tab').parent().removeClass('hidden');
  //   $('#global-navigation-tab').parent().removeClass('hidden');
  //   $('#filter-panel-tab').parent().removeClass('hidden');
  //   $('#home-page-tab').parent().removeClass('hidden');
  //   $('#map-marker-tab').parent().removeClass('hidden');
  //   $('#floorplan-unit-popup-tab').parent().removeClass('hidden');
  //   $('#gables-tab').parent().addClass('hidden');
  // }
  //
  // if (theme == 'futurist' || theme == 'panther') {
  //   $('#font-tab').parent().addClass('hidden');
  //   $('#menu-tab').parent().addClass('hidden');
  //   //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
  //   //$('#overlay-tab').parent().addClass('hidden');
  //   $('#global-navigation-tab').parent().addClass('hidden');
  //   $('#filter-panel-tab').parent().addClass('hidden');
  //   $('#home-page-tab').parent().addClass('hidden');
  //   $('#map-marker-tab').parent().addClass('hidden');
  //   $('#floorplan-unit-popup-tab').parent().addClass('hidden');
  //   $('#gables-tab').parent().addClass('hidden');
  // }
  if (theme == 'gables_organic' || theme == 'gables_refined' || theme == 'gables_energetic' || theme == 'gables_natural' || theme == 'gables_custom') {
    $('#font-tab').parent().addClass('hidden');
    $('#community-map-marker-tab').removeClass('hidden');
    $('#menu-tab').parent().addClass('hidden');
    //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
    //$('#overlay-tab').parent().addClass('hidden');
    $('#global-navigation-tab').parent().addClass('hidden');
    $('#filter-panel-tab').parent().addClass('hidden');
    $('#home-page-tab').parent().addClass('hidden');
    $('#map-marker-tab').parent().addClass('hidden');
    $('#floorplan-unit-popup-tab').parent().addClass('hidden');
    $('#gables-tab').parent().removeClass('hidden');
    $('.property_map_color_field').removeClass('hidden');
    $('.mordernist_property_map_color_field').addClass('hidden');
    $('.amenity_map_marker_color').removeClass('hidden');
    $('.modernist_amenity_map_marker_color').addClass('hidden');
    $('#futurist_ebrochure_header_background_color').addClass('hidden');
    $('#modernist_ebrochure_header_background_color').addClass('hidden');
    $('#panther_ebrochure_header_background_color').addClass('hidden');
    $('#expressionist_ebrochure_header_background_color').addClass('hidden');
    $('#gables_ebrochure_header_background_color').removeClass('hidden');
    $('.gables_property_map_size_field').removeClass('hidden');
    $('.gables_amenity_map_marker_size').removeClass('hidden');

      $('.futurist_property_map_color_field').addClass('hidden');
      $('.expressionist_property_map_color_field').addClass('hidden');
      $('.panther_property_map_color_field').addClass('hidden');

      $('.futurist_amenity_map_marker_color').addClass('hidden');
      $('.expressionist_amenity_map_marker_color').addClass('hidden');
      $('.panther_amenity_map_marker_color').addClass('hidden');

      $('.modernist_property_map_size_field').addClass('hidden');
      $('.futurist_property_map_size_field').addClass('hidden');
      $('.expressionist_property_map_size_field').addClass('hidden');
      $('.panther_property_map_size_field').addClass('hidden');

      $('.futurist_amenity_map_marker_size').addClass('hidden');
      $('.modernist_amenity_map_marker_size').addClass('hidden');
      $('.expressionist_amenity_map_marker_size').addClass('hidden');
      $('.panther_amenity_map_marker_size').addClass('hidden');

      $('.futurist_unit_floorplan_map_marker_color').addClass('hidden');
      $('.expressionist_unit_floorplan_map_marker_color').addClass('hidden');
      $('.panther_unit_floorplan_map_marker_color').addClass('hidden');
      $('.gables_unit_floorplan_map_marker_color').removeClass('hidden');
      $('.modernist_unit_floorplan_map_marker_color').addClass('hidden');
  }
  else if (theme == 'modernist') {
      $('#community-map-marker-tab').removeClass('hidden');
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
      $('.property_map_color_field').addClass('hidden');
      $('.mordernist_property_map_color_field').removeClass('hidden');
      $('.amenity_map_marker_color').addClass('hidden');
      $('.modernist_amenity_map_marker_color').removeClass('hidden');
      $('#futurist_ebrochure_header_background_color').addClass('hidden');
      $('#modernist_ebrochure_header_background_color').removeClass('hidden');
      $('#panther_ebrochure_header_background_color').addClass('hidden');
      $('#expressionist_ebrochure_header_background_color').addClass('hidden');
      $('#gables_ebrochure_header_background_color').addClass('hidden');
      $('.gables_property_map_size_field').addClass('hidden');
      $('.gables_amenity_map_marker_size').addClass('hidden');
      $('.futurist_property_map_color_field').addClass('hidden');
      $('.expressionist_property_map_color_field').addClass('hidden');
      $('.panther_property_map_color_field').addClass('hidden');
      $('.futurist_amenity_map_marker_color').addClass('hidden');
      $('.expressionist_amenity_map_marker_color').addClass('hidden');
      $('.panther_amenity_map_marker_color').addClass('hidden');
      $('.modernist_property_map_size_field').removeClass('hidden');
      $('.futurist_property_map_size_field').addClass('hidden');
      $('.expressionist_property_map_size_field').addClass('hidden');
      $('.panther_property_map_size_field').addClass('hidden');

      $('.futurist_amenity_map_marker_size').addClass('hidden');
      $('.modernist_amenity_map_marker_size').removeClass('hidden');
      $('.expressionist_amenity_map_marker_size').addClass('hidden');
      $('.panther_amenity_map_marker_size').addClass('hidden');


      $('.futurist_unit_floorplan_map_marker_color').addClass('hidden');
      $('.expressionist_unit_floorplan_map_marker_color').addClass('hidden');
      $('.panther_unit_floorplan_map_marker_color').addClass('hidden');
      $('.gables_unit_floorplan_map_marker_color').addClass('hidden');
      $('.modernist_unit_floorplan_map_marker_color').removeClass('hidden');
  }
  else if (theme == 'cubist')
  {
      $('#community-map-marker-tab').addClass('hidden');
  }
  else if (theme == 'expressionist')
  {
      $('#community-map-marker-tab').removeClass('hidden');
      $('#font-tab').parent().addClass('hidden');
      $('#menu-tab').parent().addClass('hidden');
      //$('#custom-style-tab').parent().parent().parent().addClass('hidden');
      //$('#overlay-tab').parent().addClass('hidden');
      $('#global-navigation-tab').parent().removeClass('hidden');
      $('#filter-panel-tab').parent().removeClass('hidden');
      $('#home-page-tab').parent().removeClass('hidden');
      $('#map-marker-tab').parent().removeClass('hidden');
      $('#floorplan-unit-popup-tab').parent().removeClass('hidden');
      $('#gables-tab').parent().addClass('hidden');
      $('.property_map_color_field').addClass('hidden');
      $('.mordernist_property_map_color_field').addClass('hidden');
      $('.amenity_map_marker_color').addClass('hidden');
      $('.modernist_amenity_map_marker_color').addClass('hidden');
      $('#futurist_ebrochure_header_background_color').addClass('hidden');
      $('#modernist_ebrochure_header_background_color').addClass('hidden');
      $('#panther_ebrochure_header_background_color').addClass('hidden');
      $('#expressionist_ebrochure_header_background_color').removeClass('hidden');
      $('#gables_ebrochure_header_background_color').addClass('hidden');
      $('.gables_property_map_size_field').addClass('hidden');
      $('.gables_amenity_map_marker_size').addClass('hidden');
      $('.futurist_property_map_color_field').addClass('hidden');
      $('.expressionist_property_map_color_field').removeClass('hidden');
      $('.panther_property_map_color_field').addClass('hidden');
      $('.futurist_amenity_map_marker_color').addClass('hidden');
      $('.expressionist_amenity_map_marker_color').removeClass('hidden');
      $('.panther_amenity_map_marker_color').addClass('hidden');
      $('.modernist_property_map_size_field').addClass('hidden');
      $('.futurist_property_map_size_field').addClass('hidden');
      $('.expressionist_property_map_size_field').removeClass('hidden');
      $('.panther_property_map_size_field').addClass('hidden');

      $('.futurist_amenity_map_marker_size').addClass('hidden');
      $('.modernist_amenity_map_marker_size').addClass('hidden');
      $('.expressionist_amenity_map_marker_size').removeClass('hidden');
      $('.panther_amenity_map_marker_size').addClass('hidden');

      $('.futurist_unit_floorplan_map_marker_color').addClass('hidden');
      $('.expressionist_unit_floorplan_map_marker_color').removeClass('hidden');
      $('.panther_unit_floorplan_map_marker_color').addClass('hidden');
      $('.gables_unit_floorplan_map_marker_color').addClass('hidden');
      $('.modernist_unit_floorplan_map_marker_color').addClass('hidden');
  }
  else
  {
      $('#community-map-marker-tab').removeClass('hidden');
      $('#font-tab').parent().addClass('hidden');
      $('#menu-tab').parent().addClass('hidden');
      $('#gables-tab').parent().addClass('hidden');
      $('#global-navigation-tab').parent().addClass('hidden');
      $('#filter-panel-tab').parent().addClass('hidden');
      $('#home-page-tab').parent().addClass('hidden');
      $('#map-marker-tab').parent().addClass('hidden');
      $('#floorplan-unit-popup-tab').parent().addClass('hidden');
      $('.property_map_color_field').addClass('hidden');
      $('.mordernist_property_map_color_field').addClass('hidden');
      $('.amenity_map_marker_color').addClass('hidden');
      $('.modernist_amenity_map_marker_color').addClass('hidden');
      $('#futurist_ebrochure_header_background_color').addClass('hidden');
      $('#modernist_ebrochure_header_background_color').addClass('hidden');
      $('#panther_ebrochure_header_background_color').addClass('hidden');
      $('#expressionist_ebrochure_header_background_color').addClass('hidden');
      $('#gables_ebrochure_header_background_color').addClass('hidden');

      $('.gables_property_map_size_field').addClass('hidden');
      $('.gables_amenity_map_marker_size').addClass('hidden');

      if (theme == 'futurist')
      {
          $('#futurist_ebrochure_header_background_color').removeClass('hidden');
          $('#modernist_ebrochure_header_background_color').addClass('hidden');
          $('#panther_ebrochure_header_background_color').addClass('hidden');
          $('#expressionist_ebrochure_header_background_color').addClass('hidden');
          $('#gables_ebrochure_header_background_color').addClass('hidden');
          $('.futurist_property_map_color_field').removeClass('hidden');
          $('.expressionist_property_map_color_field').addClass('hidden');
          $('.panther_property_map_color_field').addClass('hidden');
          $('.futurist_amenity_map_marker_color').removeClass('hidden');
          $('.expressionist_amenity_map_marker_color').addClass('hidden');
          $('.panther_amenity_map_marker_color').addClass('hidden');
          $('.modernist_property_map_size_field').addClass('hidden');
          $('.futurist_property_map_size_field').removeClass('hidden');
          $('.expressionist_property_map_size_field').addClass('hidden');
          $('.panther_property_map_size_field').addClass('hidden');

          $('.futurist_amenity_map_marker_size').removeClass('hidden');
          $('.modernist_amenity_map_marker_size').addClass('hidden');
          $('.expressionist_amenity_map_marker_size').addClass('hidden');
          $('.panther_amenity_map_marker_size').addClass('hidden');

          $('.futurist_unit_floorplan_map_marker_color').removeClass('hidden');
          $('.expressionist_unit_floorplan_map_marker_color').addClass('hidden');
          $('.panther_unit_floorplan_map_marker_color').addClass('hidden');
          $('.gables_unit_floorplan_map_marker_color').addClass('hidden');
          $('.modernist_unit_floorplan_map_marker_color').addClass('hidden');

      }
      else if (theme == 'panther')
      {
          $('#futurist_ebrochure_header_background_color').addClass('hidden');
          $('#modernist_ebrochure_header_background_color').addClass('hidden');
          $('#panther_ebrochure_header_background_color').removeClass('hidden');
          $('#expressionist_ebrochure_header_background_color').addClass('hidden');
          $('#gables_ebrochure_header_background_color').addClass('hidden');
          $('.futurist_property_map_color_field').addClass('hidden');
          $('.expressionist_property_map_color_field').addClass('hidden');
          $('.panther_property_map_color_field').removeClass('hidden');
          $('.futurist_amenity_map_marker_color').addClass('hidden');
          $('.expressionist_amenity_map_marker_color').addClass('hidden');
          $('.panther_amenity_map_marker_color').removeClass('hidden');

          $('.modernist_property_map_size_field').addClass('hidden');
          $('.futurist_property_map_size_field').addClass('hidden');
          $('.expressionist_property_map_size_field').addClass('hidden');
          $('.panther_property_map_size_field').removeClass('hidden');

          $('.futurist_amenity_map_marker_size').addClass('hidden');
          $('.modernist_amenity_map_marker_size').addClass('hidden');
          $('.expressionist_amenity_map_marker_size').addClass('hidden');
          $('.panther_amenity_map_marker_size').removeClass('hidden');

          $('.futurist_unit_floorplan_map_marker_color').addClass('hidden');
          $('.expressionist_unit_floorplan_map_marker_color').addClass('hidden');
          $('.panther_unit_floorplan_map_marker_color').removeClass('hidden');
          $('.gables_unit_floorplan_map_marker_color').addClass('hidden');
          $('.modernist_unit_floorplan_map_marker_color').addClass('hidden');
      }
  }
    ///////////////////////// Database changes////////////////////////

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

function adjustBorderOptions(border_element, value) {
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
  adjustFontSize(value);
}


function setBorderOptionsOnGlobalNaviagtion(border_element, value) {

  if (value == "Circular") {
    $(border_element).children("option[value^=Top-Bottom]").hide();
    $(border_element).children("option[value^=Left-Right]").hide();
    $(border_element).val("All sides");

    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=50px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=75px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=100px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=110px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=120px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=125px]").show();

    $('.button-width-field-on-global-navigation').hide();
  } else {
    console.log(value);
    $(border_element).children("option[value^=Top-Bottom]").show();
    $(border_element).children("option[value^=Left-Right]").show();

    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=50px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=75px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=100px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=110px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=120px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=125px]").show();

    $('.button-width-field-on-global-navigation').show();
  }
}
function adjustBorderOptionsOnGlobalNaviagtion(border_element, value) {

  if (value == "Circular") {
    $(border_element).children("option[value^=Top-Bottom]").hide();
    $(border_element).children("option[value^=Left-Right]").hide();

    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=50px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=75px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=100px]").hide();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=110px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=120px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=125px]").show();

    $('.button-width-field-on-global-navigation').hide();
  } else {
    console.log(value);
    $(border_element).children("option[value^=Top-Bottom]").show();
    $(border_element).children("option[value^=Left-Right]").show();

    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=50px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=75px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=100px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=110px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=120px]").show();
    $('#community_design_attributes_global_nav_buttons_height').children("option[value^=125px]").show();

    $('.button-width-field-on-global-navigation').show();
  }
}

function setLogoSize(value) {
  if (value == 'Right' || value == 'Left' || value == 'Bottom center') {
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').val('487x160');
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=300px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").hide();
    $('#community_design_attributes_home_page_buttons_width').val('350px');
  } else {
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").show();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').val('450x200');
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=300px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").show();
    $('#community_design_attributes_home_page_buttons_width').val('450px');
  }
}

function setHomePageIconsPosition(value) {
    if (value == 'Circular') {
        $('.homepage_icons_position').children("option").hide();
        $('.homepage_icons_position').val("Above the text");
    } else {
        $('.homepage_icons_position').children("option").show();
    }
}

function setGlobalNavigationIconsPosition(value) {
    if (value == 'Circular') {
        $('.global_navigation_icons_position').children("option").hide();
        $('.global_navigation_icons_position').val("Above the text");
    } else {
        $('.global_navigation_icons_position').children("option").show();
    }
}
function adjustLogoSizeAndButtonWidthFields(value) {
  if (value == 'Right' || value == 'Left') {
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").hide();
  } else {
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option").show();
    $('#community_design_attributes_expressionist_attributes_home_page_logo_size').children("option[value^=487x160]").hide();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=350px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=400px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=450px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=500px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=550px]").show();
    $('#community_design_attributes_home_page_buttons_width').children("option[value^=600px]").show();
  }
}
function adjustHomepagePositionOfLogo(value){
    if (value == 'Vertical_Left' || value == 'Vertical_Middle' || value == 'Vertical_Right') {
        $('#home_page_navigation_background_height').text('Home page navigation background width');
        if ($('#home_page_position_of_logo').val() == "Right" || $('#home_page_position_of_logo').val() == "Left")
        {
            $('#home_page_position_of_logo').val("Top");
        }
        if ($('#home_page_position_of_logo').val() == "Bottom" || $('#home_page_position_of_logo').val() == "Top")
        {
            $('.logo_size_div_field').hide();
        }
        else {
            $('.logo_size_div_field').show();
        }
        $('#home_page_position_of_logo').children("option[value^=Top]").show();
        $('#home_page_position_of_logo').children("option[value^=Bottom]").show();
        $('#home_page_position_of_logo').children("option[value^=Right]").hide();
        $('#home_page_position_of_logo').children("option[value^=Left]").hide();
    }
    else
    {
        $('.logo_size_div_field').show();
        $('#home_page_navigation_background_height').text('Home page navigation background height');
        if ($('#home_page_position_of_logo').val() == "Top" || $('#home_page_position_of_logo').val() == "Bottom")
        {
            $('#home_page_position_of_logo').val("Right");
        }
        $('#home_page_position_of_logo').children("option[value^=Top]").hide();
        $('#home_page_position_of_logo').children("option[value^=Bottom]").hide();
        $('#home_page_position_of_logo').children("option[value^=Right]").show();
        $('#home_page_position_of_logo').children("option[value^=Left]").show();
    }
}
function adjustHomepagePositionOfLogoWithVerticalApp(value){
    if (value)
    {
        $('#home_page_menu_position').children("option[value^=Top]").hide();
        $('#home_page_menu_position').children("option[value^=Middle]").hide();
        $('#home_page_menu_position').children("option[value^=Bottom]").hide();
        $('#home_page_menu_position').children("option[value^=Vertical_Left]").hide();
        $('#home_page_menu_position').children("option[value^=Vertical_Right]").hide();

        $('#home_page_position_of_logo').children("option[value^=Top]").show();
        $('#home_page_position_of_logo').children("option[value^=Bottom]").show();
        $('#home_page_position_of_logo').children("option[value^=Right]").hide();
        $('#home_page_position_of_logo').children("option[value^=Left]").hide();
        $('#home_page_position_of_logo').children("option[value^=Bottom]").hide();

        if ($('#home_page_menu_position').val() == "Top" || $('#home_page_menu_position').val() == "Middle" || $('#home_page_menu_position').val() == "Bottom")
        {
            $('#home_page_menu_position').val("Vertical_Middle");
        }
        if ($('#home_page_position_of_logo').val() == "Right" || $('#home_page_position_of_logo').val() == "Left")
        {
            $('#home_page_position_of_logo').val("Top");
        }
    }

}
function adjustMenuPositionOfLogoWithVerticalApp(value){
    if (value)
    {
        $('#menu_position_field').children("option[value^=Horizontal]").hide();
        $('#menu_position_field').val("Vertical");
        $('#vertical_menu_position').children("option[value^=Right]").hide();
        $('#vertical_menu_position').children("option[value^=Left]").hide();
        $('#vertical_menu_position').val("Middle")
    }
}
function setFontSize(value) {
  if (value == "Circular") {
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=14px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=16px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').val('14px')
  } else {
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=22px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=24px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=26px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=28px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=30px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=32px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=34px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=36px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=38px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=40px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=42px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=44px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=46px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=48px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=50px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=52px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=54px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=56px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=58px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=60px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').val('18px');
  }
}
function adjustFontSize(value) {
  if (value == "Circular") {
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=14px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=16px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
  } else {
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option").hide();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=18px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=20px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=22px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=24px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=26px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=28px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=30px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=32px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=34px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=36px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=38px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=40px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=42px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=44px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=46px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=48px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=50px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=52px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=54px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=56px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=58px]").show();
    $('#community_design_attributes_expressionist_attributes_home_page_button_font_size').children("option[value^=60px]").show();
  }
}

function setGablesThemeDefaultValues() {
  var gables_theme = $('#community_theme_name').val();
  if (gables_theme == 'gables_organic') {
    setGablesOrganicValues()
  }
  if (gables_theme == 'gables_refined') {
    setGablesRefinedValues()
  }
  if (gables_theme == 'gables_energetic') {
    setGablesEnergeticValues()
  }
  if (gables_theme == 'gables_natural') {
    setGablesNaturalValues()
  }
  if (gables_theme == 'gables_custom') {
    setGablesCustomValues()
  }
}

function setGablesOrganicValues() {
  $('#community_design_attributes_gable_attributes_appartment_button_color').val('#595277');
  $('#community_design_attributes_gable_attributes_appartment_button_color').parent().find('i').css("background-color", "#595277");
  $('#community_design_attributes_gable_attributes_gallery_button_color').val('#7C6756');
  $('#community_design_attributes_gable_attributes_gallery_button_color').parent().find('i').css("background-color", "#7C6756");
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').val('#C44628');
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').parent().find('i').css("background-color", "#C44628");
  $('#community_design_attributes_gable_attributes_favorite_button_color').val('#746634');
  $('#community_design_attributes_gable_attributes_favorite_button_color').parent().find('i').css("background-color", "#746634");
  $('#community_design_attributes_gable_attributes_filter_panel_color').val('#7C6756');
  $('#community_design_attributes_gable_attributes_filter_panel_color').parent().find('i').css("background-color", "#7C6756");
  $('#community_design_attributes_gable_attributes_webpages_button_color').val('#96348F');
  $('#community_design_attributes_gable_attributes_webpages_button_color').parent().find('i').css("background-color", "#96348F");
  $('#community_design_attributes_gable_attributes_imagepages_button_color').val('#E09A58');
  $('#community_design_attributes_gable_attributes_imagepages_button_color').parent().find('i').css("background-color", "#E09A58");
  if (window.current_theme == "gables_organic" || window.current_theme == "gables_refined" || window.current_theme == "gables_energetic" || window.current_theme == "gables_natural" || window.current_theme == "gables_custom") {
    $('#gables-form').submit();
  }
}

function setGablesRefinedValues() {
  $('#community_design_attributes_gable_attributes_appartment_button_color').val('#242628');
  $('#community_design_attributes_gable_attributes_appartment_button_color').parent().find('i').css("background-color", "#242628");
  $('#community_design_attributes_gable_attributes_gallery_button_color').val('#67665C');
  $('#community_design_attributes_gable_attributes_gallery_button_color').parent().find('i').css("background-color", "#67665C");
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').val('#5F6438');
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').parent().find('i').css("background-color", "#5F6438");
  $('#community_design_attributes_gable_attributes_favorite_button_color').val('#663330');
  $('#community_design_attributes_gable_attributes_favorite_button_color').parent().find('i').css("background-color", "#663330");
  $('#community_design_attributes_gable_attributes_filter_panel_color').val('#67665C');
  $('#community_design_attributes_gable_attributes_filter_panel_color').parent().find('i').css("background-color", "#67665C");
  $('#community_design_attributes_gable_attributes_webpages_button_color').val('#AA3239');
  $('#community_design_attributes_gable_attributes_webpages_button_color').parent().find('i').css("background-color", "#AA3239");
  $('#community_design_attributes_gable_attributes_imagepages_button_color').val('#AA3239');
  $('#community_design_attributes_gable_attributes_imagepages_button_color').parent().find('i').css("background-color", "#AA3239");
  if (window.current_theme == "gables_organic" || window.current_theme == "gables_refined" || window.current_theme == "gables_energetic" || window.current_theme == "gables_natural" || window.current_theme == "gables_custom") {
    $('#gables-form').submit();
  }
}

function setGablesEnergeticValues() {
  $('#community_design_attributes_gable_attributes_appartment_button_color').val('#8A8A8D');
  $('#community_design_attributes_gable_attributes_appartment_button_color').parent().find('i').css("background-color", "#8A8A8D");
  $('#community_design_attributes_gable_attributes_gallery_button_color').val('#44797B');
  $('#community_design_attributes_gable_attributes_gallery_button_color').parent().find('i').css("background-color", "#44797B");
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').val('#0475A9');
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').parent().find('i').css("background-color", "#0475A9");
  $('#community_design_attributes_gable_attributes_favorite_button_color').val('#D5C228');
  $('#community_design_attributes_gable_attributes_favorite_button_color').parent().find('i').css("background-color", "#D5C228");
  $('#community_design_attributes_gable_attributes_filter_panel_color').val('#467A7D');
  $('#community_design_attributes_gable_attributes_filter_panel_color').parent().find('i').css("background-color", "#467A7D");
  $('#community_design_attributes_gable_attributes_webpages_button_color').val('#96348F');
  $('#community_design_attributes_gable_attributes_webpages_button_color').parent().find('i').css("background-color", "#96348F");
  $('#community_design_attributes_gable_attributes_imagepages_button_color').val('#96348F');
  $('#community_design_attributes_gable_attributes_imagepages_button_color').parent().find('i').css("background-color", "#96348F");
  if (window.current_theme == "gables_organic" || window.current_theme == "gables_refined" || window.current_theme == "gables_energetic" || window.current_theme == "gables_natural" || window.current_theme == "gables_custom") {
    $('#gables-form').submit();
  }
}

function setGablesNaturalValues() {
  $('#community_design_attributes_gable_attributes_appartment_button_color').val('#4C878F');
  $('#community_design_attributes_gable_attributes_appartment_button_color').parent().find('i').css("background-color", "#4C878F");
  $('#community_design_attributes_gable_attributes_gallery_button_color').val('#B26F29');
  $('#community_design_attributes_gable_attributes_gallery_button_color').parent().find('i').css("background-color", "#B26F29");
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').val('#936A5E');
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').parent().find('i').css("background-color", "#936A5E");
  $('#community_design_attributes_gable_attributes_favorite_button_color').val('#67665C');
  $('#community_design_attributes_gable_attributes_favorite_button_color').parent().find('i').css("background-color", "#67665C");
  $('#community_design_attributes_gable_attributes_filter_panel_color').val('#B95333');
  $('#community_design_attributes_gable_attributes_filter_panel_color').parent().find('i').css("background-color", "#B95333");
  $('#community_design_attributes_gable_attributes_webpages_button_color').val('#8C813B');
  $('#community_design_attributes_gable_attributes_webpages_button_color').parent().find('i').css("background-color", "#8C813B");
  $('#community_design_attributes_gable_attributes_imagepages_button_color').val('#8C813B');
  $('#community_design_attributes_gable_attributes_imagepages_button_color').parent().find('i').css("background-color", "#8C813B");
  if (window.current_theme == "gables_organic" || window.current_theme == "gables_refined" || window.current_theme == "gables_energetic" || window.current_theme == "gables_natural" || window.current_theme == "gables_custom") {
    $('#gables-form').submit();
  }
}
function setGablesCustomValues() {
  $('#community_design_attributes_gable_attributes_appartment_button_color').val($('#community_design_attributes_gable_attributes_appartment_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_appartment_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_appartment_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_gallery_button_color').val($('#community_design_attributes_gable_attributes_gallery_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_gallery_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_gallery_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').val($('#community_design_attributes_gable_attributes_neighborhood_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_neighborhood_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_neighborhood_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_favorite_button_color').val($('#community_design_attributes_gable_attributes_favorite_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_favorite_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_favorite_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_filter_panel_color').val($('#community_design_attributes_gable_attributes_filter_panel_color').data('value'));
  $('#community_design_attributes_gable_attributes_filter_panel_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_filter_panel_color').data('value'));
  $('#community_design_attributes_gable_attributes_webpages_button_color').val($('#community_design_attributes_gable_attributes_webpages_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_webpages_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_webpages_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_imagepages_button_color').val($('#community_design_attributes_gable_attributes_imagepages_button_color').data('value'));
  $('#community_design_attributes_gable_attributes_imagepages_button_color').parent().find('i').css("background-color", $('#community_design_attributes_gable_attributes_imagepages_button_color').data('value'));
  if (window.current_theme == "gables_organic" || window.current_theme == "gables_refined" || window.current_theme == "gables_energetic" || window.current_theme == "gables_natural" || window.current_theme == "gables_custom") {
    $('#gables-form').submit();
  }
}
function getHeightWidthLimit (input) {
    var _URL = window.URL || window.webkitURL;
    var file, img;
    if (input.files == undefined)
    {
        if ((file = input)) {
            img = new Image();
            img.src = _URL.createObjectURL(file);
            return img;
        }
    }
    else
    {
        if ((file = input.files[0])) {
            img = new Image();
            img.src = _URL.createObjectURL(file);
            return img;
        }
    }


}
function getHeightWidthLimitMultipleFiles (input,i) {
    var _URL = window.URL || window.webkitURL;
    var file, img;
    if ((file = input.files[i])) {
        img = new Image();
        img.src = _URL.createObjectURL(file);
        img.fil = input.files[i];
        img.fil2 = input;
        return img;
    }

}
function wrongWidhAndHeight(width,height) {
    if (width < 500 || height < 500)
    {
        return true;
    }
    else {
        return false;
    }
}