class Company < ApplicationRecord
  has_many :communities
  has_many :users
end
