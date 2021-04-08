$(document).ready(function() {
  if ($(".filter_select2").length > 0){
    $('.filter_select2').select2();
    default_method();
    $('#no-sidemenu .breadcrumb').css('display', 'block')
    $('#no-sidemenu .breadcrumb').css('margin', '0px')
  }
  $('input[name="timeframe"]').on('apply.daterangepicker', function (ev, picker) {
    set_url()
  });
  function default_method() {
    var start = moment($('#start_date').val());
    var end = moment($('#end_date').val());
    function cb(start, end) {
      $('.date_range_filter span').html(start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY'));
    }

    $('.date_range_filter').daterangepicker({
        startDate: start,
        endDate: end,
        minDate: moment('04-04-2021', 'MM-DD-YYYY'),
        ranges: {
           'Today': [moment(), moment()],
           'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
           'Last 7 Days': [moment().subtract(6, 'days'), moment()],
           'Last 30 Days': [moment().subtract(29, 'days'), moment()],
           'This Month': [moment().startOf('month'), moment().endOf('month')],
           'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        }
    }, cb);

    cb(start, end);
  };
  $('.filter_select2').on('select2:select', function (e) { 
    disable_another_selects(e.target.id)
    set_url()      
  });
  
});
function disable_another_selects(current_select){
  switch(current_select){
    case "companies":
      $("#communities").val("")
      $("#regions").val("")
      $("#admin_type").val("")
      break;
    case "communities":
      $("#companies").val("")
      $("#regions").val("")
      $("#admin_type").val("")
      break;
    case "regions":
      $("#communities").val("")
      $("#companies").val("")
      $("#admin_type").val("")
      break;
    case "admin_type":
      $("#communities").val("")
      $("#companies").val("")
      $("#regions").val("")
      break;
    default:
      // code block
  }
}
function set_url(){
  params = {}
  params["community"] = $('#communities').val()
  params["product_type"] = $('#product_type').val()
  params["timeframe"] = $('#timeframe').val()
  if ($('#companies').val())
    params["company"] = $('#companies').val()
  if ($('#regions').val())
    params["region"] = $('#regions').val()
  if ($('#admin_type').val())
    params["admin_type"] = $('#admin_type').val()
  url = window.location.origin + window.location.pathname + "?"
  for (const [index, [key, value]] of Object.entries(Object.entries(params))) {
    if (index > 0)
      url = url + "&"
    if (`${key}` == "timeframe"){
      daterange = `${value}`
      start_date = daterange.split('-')[0].trim()
      end_date = daterange.split('-')[1].trim()
      url = url + `start_date=${start_date}` 
      url = url + "&" + `end_date=${end_date}` 
    }
    else
      url = url + `${key}=${value}` 
  }
  window.location.href = url
}