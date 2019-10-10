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
#  inactivate :boolean
#  company_id :integer
#  created_at :datetime         not null
#  updated_at :datetime         not null
#

class CommunityGroup < ApplicationRecord
  belongs_to :company
  has_many :communities

  validates_with CodeValidatorOnUpdate , on: [:update]
  validates_with CodeValidatorOnCreate , on: [:create]
  validates_uniqueness_of :name

  mount_base64_uploader :logo, AvatarUploader


end
