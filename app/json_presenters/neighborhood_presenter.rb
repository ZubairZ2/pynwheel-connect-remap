class NeighborhoodPresenter < JsonPresenters
	def self.minimal_hash(community)
    local_assets_base_url = "http://192.168.101.77:3000"
    hash = {}
    if community.neighborhood.present?
	    hash[:latitude] = community.neighborhood.latitude
	    hash[:longitude] = community.neighborhood.longitude
	    hash[:radius] = community.neighborhood.radius
	    hash[:zoom] = community.neighborhood.zoom
	    hash[:address] = community.neighborhood.address
	    arr = community.neighborhood.category.split(',')
	    arr.insert(0,'All')
	    categories  = []
	    arr.each do |val|
	      categories << {title: val}
	    end
	    hash[:categories] = categories
	    if community.neighborhood.locations.present?
	    	locations = []
	      community.neighborhood.locations.each do |location|
	      	struct = {
		      	title: location.title,
		        address: location.address,
		        latitude: location.latitude,
		        longitude: location.longitude,
		        category: location.category	
	      	}
	        locations << struct
	      end
	      hash[:locations] = locations 
	    end
	  end
	  hash
  end
end