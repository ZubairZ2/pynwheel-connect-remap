
json.status 200
json.message "Gallery Image object"

json.id @gallery_media&.id
json.name @gallery_media&.name
json.file_type @gallery_media.is_video? ? "video" : "image"
json.file @gallery_media.get_gallery_media()