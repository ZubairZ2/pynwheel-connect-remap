# == Schema Information
#
# Table name: gables
#
#  id                        :integer          not null, primary key
#  hide_tagline              :boolean          default(TRUE)
#  appartment_button_color   :string
#  gallery_button_color      :string
#  neighborhood_button_color :string
#  favorite_button_color     :string
#  filter_panel_color        :string
#  design_id                 :integer
#  created_at                :datetime         not null
#  updated_at                :datetime         not null
#  webpages_button_color     :string
#  imagepages_button_color   :string
#

class Gable < ApplicationRecord
  belongs_to :design
end
