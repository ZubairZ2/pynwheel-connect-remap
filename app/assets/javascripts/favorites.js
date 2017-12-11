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
		$(".datepicker").datepicker({dateFormat: 'mm/dd/yy' }); 
		new Clipboard('.clipboard-btn');
	}//if ending curl
});
