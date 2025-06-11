var favPanZoomInstances = {};
var currency = "$";

$(document).ready(function() {
  currency = $("#communityWebpagesFavoriteData").data("currency");
  // Store the initial window width
  var initialWidth = $(window).width();
  $(window).on('resize', function() {
    var currentWidth = $(window).width();
    // Check if the window width has changed significantly (e.g., ignore small changes due to scrollbars)
    if (Math.abs(currentWidth - initialWidth) > 20 ) {
      if (window.location.href.includes('favorites') || window.location.href.includes('favorites_share_link')) {
        $(".divLoading").removeClass("hidden");
        window.location.reload();
      }
      $('#sidebar-for-responsive').addClass("hidden");
      $('.h-class').removeClass('hidden');
      addAttributes();
    }
    initialWidth = currentWidth;
  });
});

$(document).ready(function(){
	if ($('.is-favorites')[0]){
    if(!smallScreen() && $(".c-connect-map-wrapper").data("action") == "favorites_share_link"){
      $(".c-connect-map-wrapper").addClass("favorites_share_link_css")
    }
    $(".c-sidebar").addClass("hidden")
    $('#sidebar-for-responsive').addClass("hidden");
    addAttributes();
    $('#favoriteclickme').click(function() {
      $("#favoriteclickme").html($("#favoriteclickme").html() == 'Share and Clear' ? 'Hide Options' : 'Share and Clear');
      var $slider = $('.mydiv-fav');
      $slider.animate({
        left: parseInt($slider.css('left'),10) == -331 ?
        0 : -331
      });
    });
		$(".leasing-start-date").datepicker({dateFormat: 'mm/dd/yy' });
    $(".c-connect-map-wrapper .c-modal-body-content").slick({
      infinite: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      vertical: false,
      dots: true,
      arrows: true,
      prevArrow: "<div class='btn prevArrowBtn view-btn-arrow btn-sm btn-block product-single__thumb-arrow product-single__thumb-arrow_left'><i class='fa fa-angle-left' style='font-size: 30px'></i></div>",
      nextArrow: "<div class='btn nextArrowBtn view-btn-arrow btn-sm btn-block product-single__thumb-arrow product-single__thumb-arrow_left'><i class='fa fa-angle-right' style='font-size: 30px'></i></div>"
    }).on('afterChange', function(event, slick, currentSlide) {
      favResetToDefaultZoom();
    });
	}
  if((window.location.href.includes('favorites') && units.length > 0) || window.location.href.includes('favorites_share_link')){
    setAttributes();
  }
  else{
    $('.floor-plan').addClass('no-fav');
  }
});

function addAttributes(){
  if (smallScreen()){
    $('#sidebar-for-responsive').removeClass("hidden");
    $('.select-list-fav').addClass("hidden");
    $('.modal-image-fav').removeClass("hidden");
    $('.h-class').addClass('hidden');
  } else{
    $('.modal-image-fav').addClass("hidden");
    $('.select-list-fav').removeClass("hidden");
    $('.disabaled-apply-now').addClass("disabaled-apply-now-for-bigger-screen")
  }
}

function setAttributes(){
  for(var x = 0; x < units.length; x++) {
    var unit_id = units[x].id
    var lease_pricing = $('#'+unit_id+'-lease-pricing').text();
    try {
      if (lease_pricing == "" || lease_pricing == undefined ) 
      {
          $('#'+unit_id+'-unit-lease-pricing-text-li').addClass('hidden');
          $('#'+unit_id+'-leas-price-option').addClass('hidden');
          $('.c-connect-map-wrapper').find('#'+unit_id+'-lease-pricing').html("No more prices are available");
      }
      else
      {
          var lease = [];
          var first_lease_item = unit_id+'-first_lease_item';
          var lease_price_arr = [];
          var lease_months_arr = [];
          ss = lease_pricing.split(';');
          var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

          ss = ss.sort(collator.compare).reverse();
          for (var i = 0; i < ss.length -1; i++) {
              var s = ss[i].split(':');
              var sp;
              if (s[2] && s[2] != "")
              {
                  sp = s[2] +" - "
              }
              else
              {
                  sp = ""
              }

            if (s[1] && parseInt(s[1]) > 0 ){
              lease.push(s[0] + " months " + sp + '<b>'+currency+ s[1]+ '<b>' + '<br>')
              lease_price_arr.push(s[1])
              lease_months_arr.push(s[0])
            }
          }
          if(lease_price_arr.every(a => a === lease_price_arr[0])){
            const leaseMonthsArrInt = lease_months_arr.map(value => parseInt(value, 10));
            const indexOfMinMonth = leaseMonthsArrInt.indexOf(Math.min(...leaseMonthsArrInt));

            if (indexOfMinMonth !== -1) {
              first_lease_item = lease[indexOfMinMonth];
              lease.splice(indexOfMinMonth, 1);
            }
          }
          else{
            const smallestLeasePrice = Math.min(...lease_price_arr.map(value => parseFloat(value)));
            const indexOfMinLease = lease_price_arr.findIndex(value => parseFloat(value) === smallestLeasePrice);

            if (indexOfMinLease !== -1) {
              first_lease_item = lease[indexOfMinLease];
              lease.splice(indexOfMinLease, 1);
            }
          }
          
          var leaseTermOptions = ""
          for (let i = 0; i < lease_months_arr.length; ++i) {
            leaseTermOptions += `<option value="${lease_months_arr[i]+" months"}" data-lease-price="${lease_price_arr[i]}" >${lease_months_arr[i]+" months"}</option>`
          }
          // $('#psi-anchor-tag').attr('data-unit-provider-id', $(element).data('unit-provider-id'));
          $('.c-connect-map-wrapper').find('#'+unit_id+'-lease-pricing').html(lease); 
          $('.c-connect-map-wrapper').find('#'+unit_id+'-first-unit-lease-pricing').html(first_lease_item);
          $('.c-connect-map-wrapper').find('#'+unit_id+'-lease_term').html(leaseTermOptions);
          $(`#${unit_id}-lease_term option[value="${first_lease_item[0]+first_lease_item[1]+" months"}"]`).attr("selected", true);
          $("#"+unit_id+"-leasing-start-date").datepicker('setDate', new Date($('#'+unit_id+'-leasing-start-date').data('available_date')));
          $("#"+unit_id+"-leasing-start-date").datepicker('option', {dateFormat: 'mm/dd/yy', minDate: $('#'+unit_id+'-leasing-start-date').data('available_date') == "Now" ? new Date() : new Date($('#'+unit_id+'-leasing-start-date').data('available_date'))});
      }
    }
    catch(err) {
        $('#'+unit_id+'-unit-lease-pricing-text-li').hide();
        $('#'+unit_id+'-leas-price-option').addClass('hidden');
        $('.c-connect-map-wrapper').find('#'+unit_id+'-lease-pricing').html("No more prices are available");
    }
    //////// Zoom In Zoom Out Action ////////////
    zoomInOut(unit_id);
  }
}

function zoomInOut(unit_id){
  $('#'+unit_id+'-zoomable-fav-image a').on("touchstart", function (e) {e.stopImmediatePropagation();});
  var area = unit_id+'area'
  var favPanZoom = unit_id+'panzoom'
  area = document.getElementById(unit_id+'-zoomable-fav-image');
    favPanZoom = panzoom(area,{bounds: true, boundsPadding: 0.4, contain: 'automatic', smoothScroll: false,maxZoom: 5,minZoom: 1,zoomDoubleClickSpeed: 1,
    onTouch: function(e) {
      e.preventDefault();
      return false;
    }
  });

  favPanZoomInstances[unit_id] = favPanZoom;

  $('#'+unit_id+'-fav-zoom-in').on('click', function (e) {
    $(area).removeClass("transform-none");
    favPanZoom.zoomInOut(187);
  });
  $('#'+unit_id+'-fav-zoom-out').on('click', function (e) {
    $(area).removeClass("transform-none");
    favPanZoom.zoomInOut(189);
  });
  $('#'+unit_id+'-fav-reset-zoom').on('click', function (e) {
    favResetToDefaultZoom();
  });  

  $('#'+unit_id+'-zoomable-fav-image').on('wheel', function(e) {
    $(area).removeClass("transform-none"); 
  })

  responsiveZoomInOut(unit_id)
}

function favResetToDefaultZoom() {
  for (var unit_id in favPanZoomInstances) {
    if (favPanZoomInstances.hasOwnProperty(unit_id)) {
      var panZoomInstance = favPanZoomInstances[unit_id];
      panZoomInstance.zoomAbs(0, 0, 1);
      panZoomInstance.moveTo(0, 0);
    }
  }
}

function responsiveZoomInOut(unit_id){
  $('#'+unit_id+'-res-zoomable-image a').on("touchstart", function (e) {e.stopImmediatePropagation();});
  var imgArea = unit_id+'res-area'
  var resPanZoom = unit_id+'res-panzoom'
  imgArea = document.getElementById(unit_id+'-res-zoomable-image');
  resPanZoom = panzoom(imgArea,{bounds: true, boundsPadding: 0.4, contain: 'automatic', smoothScroll: false,maxZoom: 5,minZoom: 1,zoomDoubleClickSpeed: 1,
    onTouch: function(e) {
      e.preventDefault();
      return false;
    }
  });
  $('#'+unit_id+'-res-fav-zoom-in').on('click', function (e) {
    $(imgArea).removeClass("transform-none");
    resPanZoom.zoomInOut(187);
  });
  
  $('#'+unit_id+'-res-fav-zoom-out').on('click', function (e) {
    $(imgArea).removeClass("transform-none");
    resPanZoom.zoomInOut(189);
  });
  $('#'+unit_id+'-res-fav-reset-zoom').on('click', function (e) {
    $(imgArea).addClass("transform-none");
  });  
  $('#'+unit_id+'-res-zoomable-image').on('wheel', function(e) {
    $(imgArea).removeClass("transform-none"); 
  })
}

function set_yardirentcafe_url_on_favrite(element){
  var url = $(element).data('availability-url');
  window.open(url, '_blank');
}

function set_psi_url_on_favorite(element){
  var url = $(element).data('availability-url');
  window.open(url, '_blank');
}

function set_resman_url_on_favorites(element) {
  var url = $(element).data('availability-url');
  window.open(url, '_blank');
}

function deleteFavorite(element){
  var url = $(element).data('href');
  $(element).html('<i class="fa fa-heart-o"></i>');
  $.ajax({
    url: url,
    type: "GET",
    success: function(data, status, xhr) {
      if(status === "success"){
        $(".divLoading").removeClass("hidden");
        window.location.reload();
      }
    },
    error: function(jqXhr, textStatus, errorMessage) {}
  });
}


function changeEffectiveRent(element){
  unitId = $(element).data('unit-id');
  select = document.getElementById(unitId+'-lease_term');
  option = select.options[select.selectedIndex];
  $('#'+unitId+'-total-price').html(currency + option.dataset.leasePrice)
}
