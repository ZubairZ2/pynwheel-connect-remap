json.status 200
json.message "List of galleries with their images"

json.data @galleries do |gallery|
  json.id gallery&.id
  json.name gallery&.name
  json.community_id gallery&.community_id
  json.is_default gallery.is_default

  json.media gallery.gallery_images do |gallery_image|
    is_video = gallery_image.is_video?

    json.id gallery_image&.id
    json.name gallery_image&.name
    json.file_type is_video ? "video" : "image"
    json.file is_video ? {url: gallery_image&.video&.url} : {url: gallery_image&.image&.url}
  end

end
