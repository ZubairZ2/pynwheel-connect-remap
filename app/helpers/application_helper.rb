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
end
