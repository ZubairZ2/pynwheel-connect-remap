class GalleryPresenter < JsonPresenters
  def self.minimal_hash(community,action)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    if community.gallery_images.present?
      categories = []
      community.galleries.pluck(:name).each do |name|
        categories << {title: name}
      end
      hash[:categories] = categories
      images = []
      for img in community.gallery_images do 
        puts '****************************************' , Time.now
        #puts '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^', img.image_url #this also slows down the loop
        struct = {}
        unless action == "ios_data"
          if img.ios_image_url.include?(".mp4")
            struct[:url] = img.large_image_url
            struct[:video] = true
            struct[:poster] = "https://images-pynwheel-cms-v2.s3.amazonaws.com/uploads/amenity/image/124/124-1518624577-video-placeholder.jpg"
          else
            struct[:url] = img.large_image_url
            struct[:video] = false
          end
          struct[:type] = img.gallery.name
          struct[:id] = img.id
        else
          unless img.ios_image_url.include?(".mp4")
            struct[:url] = img.ios_image_url
            struct[:video] = false
            struct[:type] = img.gallery.name
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