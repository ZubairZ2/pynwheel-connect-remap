# == Schema Information
#
# Table name: neighbourhood_logs
#
#  id         :integer          not null, primary key
#  from_ip    :string
#  cat        :string
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class NeighbourhoodLog < ApplicationRecord
end
