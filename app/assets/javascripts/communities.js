$(document).ready(function(){
  $('#miyazaki.community-index').DataTable({
    'aoColumnDefs': [{
      'bSortable': false,
      'aTargets': [0,1,3],
    }],
    "ordering": true,
    "stateSave": true,
    "paging": false,
    "bInfo": false
  });
});