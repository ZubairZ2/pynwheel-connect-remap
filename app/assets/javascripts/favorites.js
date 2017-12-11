$(document).ready(function(){
	if ($('.is-favorites')[0]){
		$('#clickme').click(function() {
    var $slider = $('.mydiv');
	//$('.right-side').css('margin-left', '0');
    $slider.animate({
      left: parseInt($slider.css('left'),10) == -331 ?
       0 : -331
    });
  });
		$(".leasing-start-date").datepicker({dateFormat: 'mm/dd/yy' }); 
		new Clipboard('.clipboard-btn');
	}//if ending curl
});

function set_psi_url_on_favorite(element){
	var date = $(element).parent().parent().find('input').val();
	var url = $(element).data('website')+"/Apartments/module/application_authentication/http_referer/"+$(element).data('uri')+"/popup/false/kill_session/1/property[id]/"+$(element).data('community-property-id')+"/property_floorplan[id]/"+$(element).data('floorplan-provider-id')+"/unit_space[id]/"+$(element).data('unit-provider-id')+"/show_in_popup/false/from_check_availability/1/term_month/"+$(element).data('lease-term')+"/?lease_start_date="+date;
  window.open(url,'_blank');
}
