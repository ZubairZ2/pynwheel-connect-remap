
$(document).ready(function(){
  $('#regions.table').DataTable({
    initComplete : function() {
        $("#regions_filter").detach().appendTo('#new-search-area');
    },
    "ordering": false,
    "stateSave": true,
    "info": false, //Dont display info e.g. "Showing 1 to 4 of 4 entries"
    "paging": false, //Dont want paging
    language: {
        search: "",
        searchPlaceholder: "Search by region name"
    }
  });	
});
