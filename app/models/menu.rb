# == Schema Information
#
# Table name: menus
#
#  id                          :integer          not null, primary key
#  position                    :string
#  button_style                :string
#  border_radius               :string
#  border_width                :string
#  border_color                :string
#  button_background_color     :string
#  button_hover_color          :string
#  manage_background           :boolean          default(FALSE)
#  background_color            :string
#  design_id                   :integer
#  created_at                  :datetime         not null
#  updated_at                  :datetime         not null
#  background_opacity          :float
#  vertical_menu_position      :string
#  horizontal_menu_position    :string
#  navigation_text_color       :string
#  navigation_background_color :string
#

class Menu < ApplicationRecord
	belongs_to :design
	#after_save :convert_rgba_to_hex

	def convert_rgba_to_hex
	  if attributes["background_color"].present?
        update_column(:background_color,rgbatohex(attributes["background_color"]))
	  end
	end

    def rgbatohex(rgba)
       #use following link to convert rgba to hex  
       #https://gist.github.com/whitlockjc/9363016		
	   without_start_bracket = rgba.split('(')
	   without_end_bracket =  without_start_bracket[1].split(')')
	   parts =  without_end_bracket[0].split(',')
	   opacity = parts[3].to_f
	   hex = "##{parts[0].to_i.to_s(16)}#{parts[1].to_i.to_s(16)}#{parts[2].to_i.to_s(16)}#{(opacity * 255).to_i.to_s(16)}"
    end 


end
