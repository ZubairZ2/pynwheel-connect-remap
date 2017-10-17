json.ui_settigs do
  json.theme @community.theme_name
  json.logo @community.logo.url
end

json.homescreen do
	if @community.design.present? && @community.design.home_page_images.present?
		json.images @community.design.home_page_images do |img|
		  json.filename img.name
		  json.url img.image.url
		end
	else
		json.images []
	end
	json.video	nil
	json.loop_type "images"
end