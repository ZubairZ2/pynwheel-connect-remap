# == Schema Information
#
# Table name: filter_panels
#
#  id                                         :integer          not null, primary key
#  button_border_color                        :string
#  text_font_size                             :string
#  button_text_font_size                      :string
#  design_id                                  :integer
#  created_at                                 :datetime         not null
#  updated_at                                 :datetime         not null
#  gallery_button_on_font_color               :string
#  display_gallery_button_on_background_color :boolean          default(FALSE)
#  gallery_button_on_background_color         :string
#  display_filter_panel_icon                  :boolean          default(TRUE)
#  filter_panel_icon_color                    :string
#  icon_background_color                      :string
#  icon_background_color_opacity              :string
#  gallery_button_on_background_color_opacity :string
#  filter_buttons_icons_position              :string           default("Right of text")
#  filter_panel_buttons_show_backround_color  :boolean          default(TRUE)
#

class FilterPanel < ApplicationRecord
  has_paper_trail
  belongs_to :design
end
