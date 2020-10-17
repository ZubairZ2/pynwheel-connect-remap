$(function() {
    console.log('--------------- --------')
    console.log('c id =' , $("#widget-button").attr("data-community-id"))
    console.log('s id =' , $("#widget-button").attr("data-session-id"))
    console.log('--------------- --------')

    var community_id = $("#widget-button").attr("data-community-id")
    var session_id = $("#widget-button").attr("data-session-id")
    if (community_id != undefined && community_id != ""){
        App.cable.subscriptions.create({channel: "LoggedInChannel" , community_id: community_id , session_id: session_id});
    }
});
