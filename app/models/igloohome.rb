class Igloohome < ApplicationRecord
  belongs_to :community
  has_many :igloohome_locks, dependent: :destroy
end
