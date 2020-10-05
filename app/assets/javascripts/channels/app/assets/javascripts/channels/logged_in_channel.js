$(function() {
    console.log('--------------- --------')
    console.log('id =' , $("#widget-button").attr("data-community-id"))
    console.log('--------------- --------')

    var community_id = $("#widget-button").attr("data-community-id")
    if (community_id != undefined && community_id != ""){
        App.cable.subscriptions.create({channel: "LoggedInChannel" , community_id: community_id});
    }
});
 