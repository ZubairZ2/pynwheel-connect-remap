# == Schema Information
#
# Table name: webpages
#
#  id                  :integer          not null, primary key
#  name                :string
#  url                 :string
#  community_id        :integer
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  hide_page           :boolean          default(FALSE)
#  display_on_homepage :boolean
#  position            :integer
#

class Webpage < ApplicationRecord
  belongs_to :community
  has_one :status, as: :statusable
  validates_uniqueness_of :name, scope: :community_id
  validates_presence_of :url, :name
  validates_length_of :name, :maximum => 50
  validates_with NameValidator
  validates_with WebAndImageValidator
  scope :active, -> { where(hide_page: false) }

  def as_json options = {}
    super(
      :only => [:id, :name, :url]
    )
  end
end
