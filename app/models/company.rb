class Company < ApplicationRecord
  has_many :communities, dependent: :destroy
  has_many :users, dependent: :destroy
  validates_uniqueness_of :name
end
