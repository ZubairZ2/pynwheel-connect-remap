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