$(window).on('resize', function(){
  // $(".divLoading").removeClass("hidden");
  // window.location.reload();
  $('#sidebar-for-responsive').addClass("hidden");
  $('.h-class').removeClass('hidden');
  if ($(window).width() <= 993){
    $('#sidebar-for-responsive').removeClass("hidden");
    $('.select-list-fav').addClass("hidden");
    $('.modal-image-fav').removeClass("hidden");
    $('.h-class').addClass('hidden');
  }
  else{
    $('.select-list-fav').removeClass("hidden");
  }
})

$(document).ready(function(){
	if ($('.is-favorites')[0]){
    $('#sidebar-for-responsive').addClass("hidden");
    if ($(window).width() <= 993){
      // $('.modal-wrapper-mobile').removeClass("hidden");
      $('#sidebar-for-responsive').removeClass("hidden");
      $('.select-list-fav').addClass("hidden");
      $('.modal-image-fav').removeClass("hidden");
      $('.h-class').addClass('hidden');
    }
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
    });
	}
  if(units.length > 0){
    getLeasePricing();  
  }
  else{
    $('.floor-plan').addClass('no-fav');
  }
});

function getLeasePricing(){
  for(var x = 0; x < units.length; x++) {
    var lease_pricing = $('#'+units[x].id+'-lease-pricing').text();
    try {
      if (lease_pricing == "" || lease_pricing == undefined )
      {
          $('#'+units[x].id+'-unit-lease-pricing-text-li').addClass('hidden');
          $('#'+units[x].id+'-leas-price-option').addClass('hidden');
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease-pricing').html("No more prices are available");
          // $('#unitModal').find('#unit-lease-pricing').html($(element).data('unit-lease-pricing'));
      }
      else
      {
          // var lease = "";
          var lease = [];
          var first_lease_item = "";
          var smallest_lease_month = "";
          var lease_price_arr = [];
          var lease_months_arr = [];
          // var filteredLeaseTermArray = "";
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
              lease.push(s[0] + " months " + sp + '<b>'+"$"+ s[1]+ '<b>' + '<br>')
              lease_price_arr.push(s[1])
              lease_months_arr.push(s[0])
          }
          if(lease_price_arr.every(a => a === lease_price_arr[0])){
            smallest_lease_month = Math.min(...lease_months_arr)
            var indexOfMinMonth = lease_months_arr.indexOf(smallest_lease_month.toString())
            first_lease_item = lease[indexOfMinMonth]
            if (indexOfMinMonth > -1) {
              lease.splice(indexOfMinMonth, 1);
            }
          }
          else{
            var smallest_lease_price = Math.min(...lease_price_arr)
            var indexOfMinLease = lease_price_arr.indexOf(smallest_lease_price.toString())
            first_lease_item = lease[indexOfMinLease]
            if (indexOfMinLease > -1) {
              lease.splice(indexOfMinLease, 1);
            }
          }
          var leaseTermOptions = ""
          for (let i = 0; i < lease_months_arr.length; ++i) {
            leaseTermOptions += `<option value="${lease_months_arr[i]+" months"}" >${lease_months_arr[i]+" months"}</option>`
          }
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease-pricing').html(lease);
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-first-unit-lease-pricing').html(first_lease_item);
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease_term').html(leaseTermOptions);
          $(`${units[x].id}-lease_term option[value="${first_lease_item[0]+first_lease_item[1]+" months"}"]`).attr("selected", true);
          // debugger
          // $('.c-connect-map-wrapper').find('#'+units[x].id+'-leasing-start-date').attr("value", new Date(units[x].available_date))
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-leasing-start-date').datepicker('setDate', new Date(units[x].available_date));
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-leasing-start-date').datepicker('option', {dateFormat: 'mm/dd/yy', minDate: new Date(units[x].available_date)})
      }
    }
    catch(err) {
        $('#'+units[x].id+'-unit-lease-pricing-text-li').hide();
        $('#'+units[x].id+'-leas-price-option').addClass('hidden');
        $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease-pricing').html("No more prices are available");
    }
  }
}

function set_psi_url_on_favorite(element){
	var date = $(element).parent().parent().find('input').val();
	var url = $(element).data('website')+"/Apartments/module/application_authentication/http_referer/"+$(element).data('uri')+"/popup/false/kill_session/1/property[id]/"+$(element).data('community-property-id')+"/property_floorplan[id]/"+$(element).data('floorplan-provider-id')+"/unit_space[id]/"+$(element).data('unit-provider-id')+"/show_in_popup/false/from_check_availability/1/term_month/"+$(element).data('lease-term')+"/?lease_start_date="+date;
  window.open(url,'_blank');
}

function set_resman_url_on_favorites(element)
{
  leaseTerm = $('.c-connect-map-wrapper').find('#'+$(element).data('unit-id')+'-lease_term').val().split(" months")[0]
  date = new Date($('#leasing-start-date').val())
  var url = $(element).data('availability-url') + "&leaseTerm=" + leaseTerm + "&moveInDate=" + date.toISOString().split('T')[0]
  window.open(url, '_blank');
}

function deleteFavorite(element){
    var url = $(element).data('href');
    $(element).html('<i class="fa fa-heart-o"></i>');
    setTimeout(function(){ $.ajax({url: url});}, 1000);
}

function sendAjaxToDeleteFavorite(url){
  $.ajax({url: url});
}
