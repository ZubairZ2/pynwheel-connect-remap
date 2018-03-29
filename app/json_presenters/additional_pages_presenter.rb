class AdditionalPagesPresenter < JsonPresenters
  def self.minimal_hash(community)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    if community.webpages.present?
      webpages = []
      community.webpages.active.each do |webpage|
        struct = {
          id: webpage.id,
          title: webpage.name,
          url: webpage.url  
        }
        webpages << struct
      end
      hash[:webpages] = webpages
    end
    if community.imagepages.present?
      imagepages = []
      community.imagepages.active.each do |imagepage|
        struct = {
          id: imagepage.id,
          title: imagepage.name,
          slideshow: imagepage.is_slideshow  
        }
        
        if imagepage.additional_images.present?
          images = []
          imagepage.additional_images.each do |image|
            image_struct = {
              title: image.name,
              image: Rails.env.development? ? local_assets_base_url+image.image.url : image.image.url  
            }
            images << image_struct
          end
          struct[:images] = images
        end
        imagepages << struct
      end
      hash[:imagepages] = imagepages
    end
    hash
  end
end