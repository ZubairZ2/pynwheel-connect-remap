module ApplicationHelper
	def sidemenu_communities_actions 
		["index","new","edit","create","update"]
	end
	def flash_class(level)
		case level
			when 'notice' then "alert alert-success"
			when 'error' then "alert alert-danger"
			when 'alert' then "alert alert-danger"	
		end
	end

	def font_families
		["Agency FB","Arial","BankFuturistic" ,"Courier","Cursive","Decorative","Fantasy","Fraktur","Helvetica","Impact","Monospace","Open Sans","Palatino","Roman","Sans-serif","Serif","Times","Tw Cen MT"]
	end

	def font_sizes
		["8px","9px","10px","11px","12px","13px","14px","15px","16px","17px","18px","19px","20px"]
	end

	def font_weight
		["normal","bold","lighter"]
	end

	def text_align
		["left","right","center","justify","inherit","unset","start","end"]
	end

	def menu_position
		["Vertical","Horizontal"]
	end

	def vertical_menu_position
		["Left","Middle","Right"]
	end

	def horizontal_menu_position
		["Top","Middle","Bottom"]
	end

	def button_style
		["Solid","Bordered","Top","Bottom"]
	end

	def border_radius
		["1px","2px","3px","4px","5px","6px","7px","8px","9px","10px"]
	end
	def border_width
		["1px","2px","3px","4px","5px","6px","7px","8px","9px","10px"]
	end

	def logo_position
		["Top","Center","Bottom"]
	end

	def secondary_logo_position
		["Right","Center","Left"]
	end

	def global_navigation_position
		["Top","Bottom"]
	end

	def convert_float_to_integer(x)
		if x%1 == 0
			return x.to_i
		else
			return x
		end
	end

	# def find_floorplate_number(amenityable_id)
 #      floorplate = Floorplate.find amenityable_id
 #      return floorplate.number
	# end

	def uri(website)
        website.gsub(/^https?\:\/\//,'')
	end

	def unit_id_is_in_cookies?(cookies,fav_unit_id)
		array = JSON.parse(cookies)
		array.include? fav_unit_id.to_s
	end

	# def unit_count(hash,plot_x,plot_y)
	# 	count = ""
	# 	hash.each do |h|
	# 		array_as_key = h[0] 
	# 		if plot_x == array_as_key[0] and plot_y == array_as_key[1]
	# 			value = h[1]
	# 			if value.to_i > 1
	# 			 count = value
	# 			end 
	# 		end
	# 	end
	# 	return count
	# end

	def set_active_class(x,categories)
		arr = categories.split(',')
		if arr.include? x
			return 'active'
		else
			return ''
		end
	end

	def hide_decimals(x)
		if x%1 == 0
			return x.to_i
		else
			return x
		end
	end

	def bathroom_text(floorplan)
		floorplan.bathrooms <= 1 ? "Bathroom" : "Bathrooms"
	end

	def bedroom_text(floorplan)
		floorplan.bedrooms == "1" ? "Bedroom" : "Bedrooms"
	end

	def style_themes
		["modernist","cubist","expressionist"]
	end

	def gables_theme(community)
		if community.theme_name.present?
			name = community.theme_name.split('_')
			if name[0] == 'gables'
				return true
			else
				return false
			end
		else
			return false
		end
	end
		
end
