class OtherLock < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable
end
