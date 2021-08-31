$(document).ready(function(){
	if ($('.is-favorites')[0]){
		$('#favoriteclickme').click(function() {
      $("#favoriteclickme").html($("#favoriteclickme").html() == 'Share and Clear' ? 'Hide Options' : 'Share and Clear');
    var $slider = $('.mydiv_fav');
	//$('.right-side').css('margin-left', '0');
    $slider.animate({
      left: parseInt($slider.css('left'),10) == -331 ?
       0 : -331
    });
  });
		$(".leasing-start-date").datepicker({dateFormat: 'mm/dd/yy' }); 
    
	}//if ending curl
  getLeasePricing();  
});

function getLeasePricing(){
  for(var x = 0; x < units.length; x++) {
    var lease_pricing = $('#'+units[x].id+'-lease-pricing').text();
    try {
      if (lease_pricing == "")
      {
          // $('#unit-lease-pricing-text-li').hide();
          $('#'+units[x].id+'-leas-price-option').addClass('hidden');
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease-pricing').html("No more prices are available");
          // $('#unitModal').find('#unit-lease-pricing').html($(element).data('unit-lease-pricing'));
      }
      else
      {
          var lease = "";
          ss = lease_pricing.split(';');
          var collator = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

          ss = ss.sort(collator.compare).reverse();
          for (var i = 0; i < ss.length -1; i++) {
              var s = ss[i].split(':');
              var sp;
              if (s[2] != "")
              {
                  sp = s[2] +" - "
              }
              else
              {
                  sp = ""
              }
              lease = lease + s[0] + " months - " + sp +"$"+ s[1] + '<br>'
          }
          $('.c-connect-map-wrapper').find('#'+units[x].id+'-lease-pricing').html(lease);
      }
    }
    catch(err) {
        debugger
        // $('#unit-lease-pricing-text-li').hide();
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

function deleteFavorite(element){
    var url = $(element).data('href');
    $(element).html('<i class="fa fa-heart-o"></i>');
    setTimeout(function(){ $.ajax({url: url});}, 1000);
}

function sendAjaxToDeleteFavorite(url){
  $.ajax({url: url});
}
