class GalleryPresenter < JsonPresenters
  def self.minimal_hash(community,action,gallery_images)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    if community.gallery_images.present?
      categories = []
      community.galleries.pluck(:name).each do |name|
        categories << {title: name}
      end
      hash[:categories] = categories
      images = []
      gallery_images.each do |img| 
        puts '*******************************' , Time.now
        struct = {}
        unless action == "ios_data"
          if img.image.file.extension.downcase == 'mp4'
            #struct[:url] = img.image.url
            struct[:url] = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
            struct[:video] = true
            struct[:poster] = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
          else
            #struct[:url] = img.image.url(:large)
            struct[:url] = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
            struct[:video] = false
          end
          #struct[:type] = img.gallery.name
          struct[:type] = "Dummy Name"
          struct[:id] = img.id
        else
          unless img.is_video?
            #struct[:url] = img.image.url(:ios)
            struct[:url] = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
            struct[:video] = false
            #struct[:type] = img.gallery.name
            struct[:type] = "dummy Name"
            struct[:id]= img.id
          end
        end
        images << struct
      end
      hash[:images] = images
    end
    hash
  end
end