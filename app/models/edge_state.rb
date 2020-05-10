class EdgeState < ApplicationRecord
  belongs_to :user
  belongs_to :community
  has_many :remote_locks
end
