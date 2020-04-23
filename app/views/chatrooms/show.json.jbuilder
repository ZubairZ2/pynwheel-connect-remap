json.extract! @chatroom, :id, :tour_user_id, :tour_id
json.url chatroom_url(@chatroom, format: :json)     