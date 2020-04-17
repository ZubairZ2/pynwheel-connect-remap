App.chat = App.cable.subscriptions.create "ChatChannel",
  connected: ->
    # Called when the subscription is ready for use on the server

  disconnected: ->
    # Called when the subscription has been terminated by the server

  received: (data) ->
    $('.Pyn_Modal').append("<div>" + data['message'] + "</div>");
    # Called when there's incoming data on the websocket for this channel

  speak: (message) ->
    # created for futher use if required