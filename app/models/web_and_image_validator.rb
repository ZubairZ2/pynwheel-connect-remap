class WebAndImageValidator < ActiveModel::Validator
  def validate(record)
    #    image = Imagepage.find_by(name: record.attributes["name"])
    #    web = Webpage.find_by(name: record.attributes["name"])
    #    if web == nil && image == nil
    #      web = Webpage.new
    #      image = Imagepage.new
    #    end
    #    if web == nil 
    #      web = image
    #    elsif image ==nil
    #      image = web
    #    end      
    #if image.position == record.attributes["position"] || web.position == record.attributes["position"]
    #else
    if record.attributes["display_on_homepage"]
      total_number_of_pages = Imagepage.where(:display_on_homepage => true,community_id: record.community_id).count + Webpage.where(:display_on_homepage => true,community_id: record.community_id).count
      if total_number_of_pages > 3
        record.errors[:base] << "You can add only three image pages or webpages." 
      end
    end
    positions = Imagepage.where(community_id: record.community_id).map(&:position) +  Webpage.where(community_id: record.community_id).map(&:position)
    if record.new_record? and positions.include?(record.attributes["position"].to_i)
      record.errors[:base] << "Position #{record.attributes['position']} has already been taken."
    elsif record.position_changed? and positions.include?(record.attributes["position"].to_i)
      record.errors[:base] << "Position #{record.attributes['position']} has already been taken."
    end
    #end
  end
end