class EdgeState < ApplicationRecord
  belongs_to :community
  has_many :remote_locks, dependent: :destroy
end
