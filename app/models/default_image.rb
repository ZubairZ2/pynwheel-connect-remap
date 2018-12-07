# == Schema Information
#
# Table name: default_images
#
#  id         :integer          not null, primary key
#  name       :string
#  image      :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class DefaultImage < ApplicationRecord
end
