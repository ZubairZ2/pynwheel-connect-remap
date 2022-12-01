json.status 200
json.message "List of gallery images"

json.id @gallery&.id

json.media @gallery.gallery_images do |gallery_image|
  is_video = gallery_image.is_video?

  json.id gallery_image&.id
  json.name gallery_image&.name
  json.file_type is_video ? "video" : "image"
  json.file is_video ? {url: gallery_image&.video&.url} : {url: gallery_image&.image&.url}
end