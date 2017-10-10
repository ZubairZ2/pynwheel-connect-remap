$(document).ready(function () {
    if ($('.is-community-page')[0]){
      find_geocodes();
    }
    $(document).on('change', '.address_fields', function() {
        console.log(" * address changed *")
        var address = buildAddress()
        find_geocodes(address);
    })

})

function find_geocodes(address) {
    var geocoder = new google.maps.Geocoder();

    geocoder.geocode( { 'address': address}, function(results, status) {

        if (status == google.maps.GeocoderStatus.OK) {
            var latitude = results[0].geometry.location.lat().toFixed(6);
            var longitude = results[0].geometry.location.lng().toFixed(6);
            if (latitude != null){
                // console.log(longitude)
                showResult(latitude,longitude)
            }
        }
    });
}

function showResult(latitude,longitude) {
    document.getElementById('community_latitude').value = latitude;
    document.getElementById('community_longitude').value = longitude;
}

function buildAddress(){
    var address = document.getElementById('community_address').value;
    var city = document.getElementById('community_city').value;
    var state = document.getElementById('community_state').value;
    var zip = document.getElementById('community_zip').value;
    var completeAddress = address+city+state+zip;
    return completeAddress;
}