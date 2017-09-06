class Community < ApplicationRecord
  mount_uploader :logo, AvatarUploader
  belongs_to :company
  has_many :units, dependent: :destroy
  has_many :floorplans, dependent: :destroy
  has_one :credential , dependent: :destroy
  accepts_nested_attributes_for :credential
end
