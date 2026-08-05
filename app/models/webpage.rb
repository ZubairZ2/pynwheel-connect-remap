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
  include LaunchStatusable

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

  def get_webpage_virtual_tour_url
    if self&.url.present?
      if self&.url&.include? '</iframe>'
        iframe_url = self.url.split('height')
        if iframe_url[1][3] == '"'
          iframe_url[1][2] = '1' + '0' + '0' + '%'
        elsif iframe_url[1][4] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0' + '0' + '%'
        elsif iframe_url[1][5] == '"'
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0' + '%'
        else
          iframe_url[1][2] = '1'
          iframe_url[1][3] = '0'
          iframe_url[1][4] = '0'
          iframe_url[1][5] = '%'
        end
        
        iframe_url[0] + 'height' + iframe_url[1]
      else
        self.url
      end
    else
      ""
    end
  end

  # Launch: an additional web page is complete once it is named and linked.
  def derive_launch_status
    launch_status_from(name.present? && url.present?)
  end
end
