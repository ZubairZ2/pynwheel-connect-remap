class Community < ApplicationRecord
  belongs_to :company
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
end
