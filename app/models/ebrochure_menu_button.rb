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
  has_paper_trail
  belongs_to :favorite_setting
  include LaunchStatusable

  # Launch: an e-brochure weblink is complete once it is named and linked.
  def derive_launch_status
    launch_status_from(name.present? && url.present?)
  end
end
