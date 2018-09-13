class WebAndImageValidator < ActiveModel::Validator
  def validate(record)
   if record.attributes["display_on_homepage"]
  	  if Imagepage.where(:display_on_homepage => true,community_id: record.community_id).count > 3 || Webpage.where(:display_on_homepage => true,community_id: record.community_id).count > 3
  		record.errors[:base] << "You can add only three image pages or webpages." 
  	  end
    end
    positions = Imagepage.where(community_id: record.community_id).map(&:position) +  Webpage.where(community_id: record.community_id).map(&:position)

  if positions.include?(record.attributes["position"].to_i)
  	record.errors[:base] << "Position #{record.attributes['position']} has already been taken."
  end
  end
end