class HomescreenPresenter < JsonPresenters
  def self.minimal_hash(community)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    images = []
    if community.design.present?
      if community.design.home_page_images.present?
        community.design.home_page_images.each do |img|
          struct = {
            filename: img.name,
            url: Rails.env.development? ? local_assets_base_url+img.image.url(:large) : img.image.url(:large)
          }
          images << struct
        end
      else
        DefaultImage.find_each do |img|
          struct = {
            filename: img.name,
            url: Rails.env.development? ? local_assets_base_url+img.image : asset_url(img.image)
          }
          images << struct
        end
      end
      hash[:images] = images
      vid = community.design.home_page_video.present? ? ( Rails.env.development? ? local_assets_base_url+community.design.home_page_video.video.url : community.design.home_page_video.video.url ) : nil
      hash[:video] = vid
      hash[:loop_type] = vid.present? ? community.design.loop_type : "images"
    else
      DefaultImage.find_each do |img|
        struct = {
          filename: img.name,
          url: Rails.env.development? ? local_assets_base_url+img.image : asset_url(img.image)
        }
        images << struct
      end
      hash[:images] = images
      hash[:video] = nil
      hash[:loop_type] = "images"
    end
    hash
  end
end