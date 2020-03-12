# == Schema Information
#
# Table name: community_groups
#
#  id         :integer          not null, primary key
#  name       :string
#  address    :string
#  code       :string
#  page_type  :boolean          default(FALSE)
#  page_name  :string
#  logo       :string
#  inactivate :boolean          default(FALSE)
#  company_id :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class CommunityGroup < ApplicationRecord
  has_paper_trail
  belongs_to :company
  has_many :communities
  has_one :group_design, dependent: :destroy

  validates_with CodeValidatorOnUpdate , on: [:update]
  validates_with CodeValidatorOnCreate , on: [:create]
  # accepts_nested_attributes_for :group_design
  validates_uniqueness_of :name

  mount_base64_uploader :logo, AvatarUploader


end
