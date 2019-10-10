# == Schema Information
#
# Table name: app_versions
#
#  id                   :integer          not null, primary key
#  version              :string
#  created_at           :datetime         not null
#  updated_at           :datetime         not null
#  neighborhood_counter :integer
#

class AppVersion < ApplicationRecord
end
