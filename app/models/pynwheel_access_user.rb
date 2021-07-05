class PynwheelAccessUser < ApplicationRecord
  enum user_type: [ :resident, :staff ]

  belongs_to :community
end
