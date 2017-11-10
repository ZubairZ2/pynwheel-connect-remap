module ApplicationHelper
	def sidemenu_communities_actions 
		["index","new","edit"]
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
		["Left","Right"]
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
		
end
