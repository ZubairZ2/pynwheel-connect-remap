json.ui_settigs do
  json.theme @community.theme_name
  json.logo @community.logo.present? ? (Rails.env.development? ? "http://192.168.101.77:3000"+@community.logo.url : @community.logo.url) : nil
end

json.homescreen do
	if @community.design.present?
		if @community.design.home_page_images.present?
			json.images @community.design.home_page_images.order(:sort) do |img|
			  json.filename img.name
			  json.url Rails.env.development? ? "http://192.168.101.77:3000"+img.image.url : img.image.url
			end
		else
			json.images []
		end
		json.video	@community.design.home_page_video.present? ? ( Rails.env.development? ? "http://192.168.101.77:3000"+@community.design.home_page_video.video.url : @community.design.home_page_video.video.url ) : nil 
		json.loop_type @community.design.loop_type
	else
		json.images []
		json.video nil
		json.loop_type ""
	end
end

json.apartments do
	json.sitemap @community.sitemap.present? ? @community.sitemap.image.url : nil
	json.units @community.units do |unit|
		json.marketing_name unit.marketing_name
		json.rent unit.effective_rent
		json.availability unit.availability
		json.available_date unit.available_date
		json.x_plot unit.x_plot
		json.y_plot unit.y_plot
		json.building unit.building
		json.floorplan_id unit.floorplan_id
		json.unit_type unit.unit_type
		json.provider_unit_id unit.provider_unit_id
		json.id unit.id
	end
	json.floorplans @community.floorplans do |floorplan|
	  json.id floorplan.id
	  json.provider_floorplan_id floorplan.provider_floorplan_id
	  json.name floorplan.name
	  json.rent floorplan.market_rent
	  json.units_available floorplan.units_available
	  json.unit_count floorplan.unit_count
	  json.bedrooms floorplan.bedrooms
	  json.bathrooms floorplan.bathrooms
	  json.square_feet floorplan.square_feet
	  json.description floorplan.description
	  json.image floorplan.image.present? ? floorplan.image.url : nil
	end
end

json.message "success"
json.operation "data"