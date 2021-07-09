class Region < ApplicationRecord
  
  has_many :communities
  belongs_to :company

  validates_uniqueness_of :name
  validates_presence_of :name
  
end
