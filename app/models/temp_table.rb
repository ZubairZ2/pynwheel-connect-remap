# == Schema Information
#
# Table name: temp_tables
#
#  id             :integer          not null, primary key
#  community_log  :string
#  community_log1 :string
#  created_at     :datetime         not null
#  updated_at     :datetime         not null
#

class TempTable < ApplicationRecord
end
