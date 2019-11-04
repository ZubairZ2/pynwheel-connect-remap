# == Schema Information
#
# Table name: favorite_settings
#
#  id                             :integer          not null, primary key
#  community_id                   :integer
#  email_from                     :string
#  email_bcc                      :string
#  created_at                     :datetime         not null
#  updated_at                     :datetime         not null
#  email_body                     :string           default("Thank you for visiting <community_name>! Here are your favorites. Click on the images below to expand them.\n\nWe look forward to seeing you again soon.")
#  show_favorite                  :boolean          default(TRUE)
#  favorite_name                  :string           default("Favorites")
#  equal_housing_opportunity_logo :boolean          default(TRUE)
#  handicap_accessible_logo       :boolean          default(TRUE)
#

class FavoriteSetting < ApplicationRecord
  belongs_to :community
  has_many :favorite_images, dependent: :destroy
  has_many :ebrochure_menu_buttons, dependent: :destroy
  validate :page_name_length_validate

  amoeba do
    enable
  end
  def page_name_length_validate
    if attributes['favorite_name'].present?
      words = attributes['favorite_name'].split(" ")
      if words.size > 3
        errors[:base] << "Page name can be added upto three words and each word must be 15 characters long."
      end

      words.each do |w|
        if w.size > 15
          errors[:base] << "Page name can be added upto three words and each word must be 15 characters long."
        end
      end
    end
  end
end
