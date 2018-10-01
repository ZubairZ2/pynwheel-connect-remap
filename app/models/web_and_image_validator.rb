class WebAndImageValidator < ActiveModel::Validator
  def validate(record)
    temp = Community.find(record.community_id)
    if(temp.display_unit_on_homepage && record.attributes["position"].to_i == 1)
      record.errors[:base] << "Home Page is already selected for position 1."
    end
    if(temp.display_gallery_on_homepage && record.attributes["position"].to_i == 2)
      record.errors[:base] << "Gallery page is already selected for position 2."
    end
    if temp.neighborhood.present?
      if(temp.neighborhood.display_neighborhood_on_homepage && record.attributes["position"].to_i == 3)
        record.errors[:base] << "Neighborhood Page is already selected for position 3."
      end
    end
    positions = Imagepage.where(community_id: record.community_id).map(&:position) +  Webpage.where(community_id: record.community_id).map(&:position)
    if record.new_record? and positions.include?(record.attributes["position"].to_i)
      record.errors[:base] << "Position #{record.attributes['position']} has already been taken."
    elsif record.position_changed? and positions.include?(record.attributes["position"].to_i)
      record.errors[:base] << "Position #{record.attributes['position']} has already been taken."
    end
    if record.attributes["display_on_homepage"]
      total_number_of_pages = Imagepage.where(:display_on_homepage => true,community_id: record.community_id).count + Webpage.where(:display_on_homepage => true,community_id: record.community_id).count
      if total_number_of_pages > 3
        record.errors[:base] << "You can add only three image pages or webpages as display on home page." 
      end
    end
    
  end
end