$(document).ready(function(){
	if ($('.is-favorites')[0]){
		$(".datepicker").datepicker({dateFormat: 'mm/dd/yy' }); 
		new Clipboard('.clipboard-btn');
	}//if ending curl
});
