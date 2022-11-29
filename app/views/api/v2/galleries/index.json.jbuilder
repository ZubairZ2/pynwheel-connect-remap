json.status 200
json.message "List of galleries with their images"

json.data @galleries do |gallery|
  json.id gallery&.id
  json.name gallery&.name
  json.community_id gallery&.community_id
  json.is_default gallery.is_default

  json.media gallery.galleries_images do |gallery_image|
    json.id gallery_image&.id
    json.name gallery_image&.name
    json.file_type gallery_image.is_video? ? "video" : "image"
    json.file gallery_image.get_gallery_media()
  end

end
