# == Schema Information
#
# Table name: companies
#
#  id         :integer          not null, primary key
#  name       :string
#  address    :string
#  city       :string
#  state      :string
#  zip        :string
#  email      :string
#  phone      :string
#  logo       :string
#  locked     :boolean
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  inactivate :boolean          default(FALSE)
#

class Company < ApplicationRecord
  has_paper_trail
  has_many :communities, dependent: :destroy
  has_many :users, dependent: :destroy
  has_many :community_groups, dependent: :destroy
  validates_uniqueness_of :name
end
