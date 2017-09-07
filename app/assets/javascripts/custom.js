$(document).ready(function(e){

var headertext = [],
    headers = document.querySelectorAll("#miyazaki th"),
    tablerows = document.querySelectorAll("#miyazaki th"),
    tablebody = document.querySelector("#miyazaki tbody");

for(var i = 0; i < headers.length; i++) {
    var current = headers[i];
    headertext.push(current.textContent.replace(/\r?\n|\r/,""));
}
for (var i = 0, row; row = tablebody.rows[i]; i++) {
    for (var j = 0, col; col = row.cells[j]; j++) {
        col.setAttribute("data-th", headertext[j]);
    }
}

$("li").on("click", function (e) {
    $(this).siblings(".active" ).removeClass("active")
    $(this).addClass("active")
})

})

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    ev.dataTransfer.setData("text", ev.target.id);
}

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text");
    ev.target.appendChild(document.getElementById(data));
}
// preview image function
function readURL(input) {

    if (input.files && input.files[0]) {
        var reader = new FileReader();

        reader.onload = function (e) {
            $('#preview-image').attr('src', e.target.result);
        }

        reader.readAsDataURL(input.files[0]);
    }
}

$(document).ready(function () {

    var data_provider = $("#community_data_provider").val();
    selectDataProvider(data_provider);
    $("#community_data_provider").change(function(){
        selectDataProvider($(this).val());
    });
});

function selectDataProvider(data_provider){
    switch(data_provider) {
        case "realpagesvc":
            showRealPageSVCFields();
            break;
        case "yardirentcafe":
            showYardiRentCafeFields();
            break;
        case "yardi2":
            showYardiFields();
            break;
        case "yardi4":
            showYardiFields();
            break;
        case "psi":
            showPsiFields();
            break;
    }
}

function showPsiFields(){
    $('.credential_fields').hide();
    $('#domain').show();
    $('#password').show();
    $('#username').show();
    $('#property_id').show();
}

function showYardiFields(){
    $('.credential_fields').hide();
    $('#domain').show();
    $('#host').show();
    $('#username').show();
    $('#password').show();
    $('#server_name').show();
    $('#database').show();
    $('#platform').show();
    $('#property_id').show();
    $('#license_key').show();
    $('#interface_entity').show();
}

function showYardiRentCafeFields(){
    $('.credential_fields').hide();
    $('#domain').show();
    $('#property_id').show();
}

function showRealPageSVCFields(){
    $('.credential_fields').hide();
    $('#property_id').show();
    $('#pmc_id').show();
    $('#username').show();
    $('#password').show();
    $('#license_key').show();
}