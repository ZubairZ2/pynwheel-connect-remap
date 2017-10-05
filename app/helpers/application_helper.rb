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
    	["Agency FB","Antiqua","Architect","Arial","BankFuturistic","BankGothic","Blackletter","Blagovest","Calibri", "Comic Sans MS" ,"Courier","Cursive","Decorative","Fantasy","Fraktur","Frosty","Garamond","Georgia","Helvetica","Impact","Minion","Modern","Monospace","Open Sans","Palatino","Roman","Sans-serif","Serif","Script","Swiss","Times","Times New Roman","Tw Cen MT","Verdana"]
    end

    def font_sizes
    	["8px","9px","10px","11px","12px","13px","14px","15px","16px","17px","18px","19px","20px","21px","22px","23px","24px","25px","26px","29px","32px","35px","36px","37px","38px","40px","42px","45px","48px"]
    end

    def font_weight
    	["normal","bold","bolder","lighter"]
    end

    def text_align
    	["left","right","center","justify","justify-all","inherit","initial","unset","start","end","match-parent"]
    end

    def menu_position
        ["Left","Right","Top","Bottom"]
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
end
