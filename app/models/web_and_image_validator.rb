class WebAndImageValidator < ActiveModel::Validator
  def validate(record)
    image = Imagepage.find_by(name: record.attributes["name"])
    web = Webpage.find_by(name: record.attributes["name"])
    if web == nil && image == nil
      web = Webpage.new
      image = Imagepage.new
    end
    if web == nil 
      web = image
    elsif image ==nil
      image = web
    end      
    if image.position == record.attributes["position"] || web.position == record.attributes["position"]
    else
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
end