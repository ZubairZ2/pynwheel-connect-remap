json.message "success"
json.success true
json.updated_user do
  json.id @updated_dwelo_user["id"]
  json.starts_at @updated_dwelo_user["starts_at"]
  json.ends_at @updated_dwelo_user["ends_at"]
end 
