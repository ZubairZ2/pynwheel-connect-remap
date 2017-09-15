$(document).ready(function () {
    $(document).on('change', '#community_city', function() {
        console.log(" * address *")
        var address = document.getElementById('community_city').value;
        getLatitudeLongitude(showResult, address)
    })

})

function getLatitudeLongitude(callback, address) {
    // If adress is not supplied, use default value 'Ferrol, Galicia, Spain'
    address = address || 'Ferrol, Galicia, Spain';
    // Initialize the Geocoder
    geocoder = new google.maps.Geocoder();
    if (geocoder) {
        geocoder.geocode({
            'address': address
        }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                callback(results[0]);
            }
        });
    }
}

function showResult(result) {
    document.getElementById('community_latitude').value = result.geometry.location.lat();
    document.getElementById('community_longitude').value = result.geometry.location.lng();
}