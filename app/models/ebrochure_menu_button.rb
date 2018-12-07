# == Schema Information
#
# Table name: ebrochure_menu_buttons
#
#  id                  :integer          not null, primary key
#  name                :string
#  url                 :text
#  favorite_setting_id :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#

class EbrochureMenuButton < ApplicationRecord
  belongs_to :favorite_setting
end
