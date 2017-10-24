json.ui_settigs do
  json.theme @community.theme_name
  json.logo @community.logo.present? ? @community.logo.url : nil
end

json.homescreen do
	if @community.design.present?
		if @community.design.home_page_images.present?
			json.images @community.design.home_page_images.order(:sort) do |img|
			  json.filename img.name
			  json.url img.image.url
			end
		else
			json.images []
		end
		json.video	@community.design.home_page_video.present? ? @community.design.home_page_video.video.url : nil 
		json.loop_type @community.design.loop_type
	else
		json.images []
		json.video nil
		json.loop_type ""
	end
end

json.message "success"
json.operation "data"