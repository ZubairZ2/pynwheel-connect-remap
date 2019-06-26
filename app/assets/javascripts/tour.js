$(document).ready(function () {

    doDraggable();

    // $('.amenities-list').on('change', function(e) {
    //   e.preventDefault();
    //   console.log($(this).val());
    //   $('.amenities-list :selected').each(function(){
    //     if ($(this).val()!=""){
    //       console.log('selecting dropdown values from sitemap');
    //       console.log($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1);
    //       if (selected.length == 0){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //       else if ($.inArray($(this).val(), $.map(selected, function(v) { return v[0]; })) == -1){
    //         selected.push([ $(this).val(), $.trim($(this).text()) ]);
    //       }
    //     }
    //     // add to selected list
    //     $("#selected-units").empty();
    //     for (i=0; i<selected.length; i++) {
    //       $("#selected-units").append('<li class="s-unit" data-id='+i+' data-provider-unit-id='+selected[i][0]+'>' + selected[i][1] + '</li>');
    //     }
    //     $('#newmsg').hide();

    //     // hide from unused list
    //     $(this).css({"display": "none"});
    //     plotMode();
    //   });
    // });


    $('.plot_starting_point').click(function () {
        console.log("We are extracting -selectable from unit_provider_id");
        var unit_provider_id = $(this).attr('id');
        console.log(unit_provider_id);
        selected.push([unit_provider_id, $(this).children('span').text()]);
        plotMode();
    });

});
