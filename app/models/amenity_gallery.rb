# == Schema Information
#
# Table name: amenity_galleries
#
#  id               :integer          not null, primary key
#  amenity_id       :integer
#  image            :string
#  description      :string
#  name             :string
#  created_at       :datetime         not null
#  updated_at       :datetime         not null
#  directional_text :string
#

class AmenityGallery < ApplicationRecord
  # has_paper_trail
  include RailsSortable::Model
  set_sortable :sort  
  belongs_to :amenity
  mount_base64_uploader :image, AvatarUploader

  def as_json options = {}
    super(
      :only => [:id, :name, :image]
    )
  end

  def stop_description_formatting stop_description
    return "" unless stop_description.present?
    
    if stop_description.match?(/<ul\b.*?>|<ol\b.*?>/)
      doc = Nokogiri::HTML(stop_description)
      items = doc.css('ul li').map(&:text)
      items.join(', ')
    else
      ActionView::Base.full_sanitizer.sanitize(stop_description)
    end
  end
end
