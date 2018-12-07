# == Schema Information
#
# Table name: favorite_settings
#
#  id            :integer          not null, primary key
#  community_id  :integer
#  email_from    :string
#  email_bcc     :string
#  created_at    :datetime         not null
#  updated_at    :datetime         not null
#  email_body    :text
#  show_favorite :boolean          default(TRUE)
#  favorite_name :string           default("Favorites")
#

class FavoriteSetting < ApplicationRecord
  belongs_to :community
  has_many :favorite_images, dependent: :destroy
  has_many :ebrochure_menu_buttons, dependent: :destroy
end
