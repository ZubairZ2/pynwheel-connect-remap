# == Schema Information
#
# Table name: galleries
#
#  id           :integer          not null, primary key
#  name         :string
#  community_id :integer
#  created_at   :datetime         not null
#  updated_at   :datetime         not null
#  sort         :integer
#

class Gallery < ApplicationRecord
	include RailsSortable::Model
	set_sortable :sort

	has_many :gallery_images, dependent: :destroy
	belongs_to :community
	has_one :status, as: :statusable
	validates :name, presence: true, uniqueness: {scope: :community}

	def delete_gallery
		DeleteGalleryJob.perform_async self
	end

	def stop_description_formatting stop_description
	    return "" unless stop_description.present?
	    
	    if stop_description.match?(/<ul\b.*?>|<ol\b.*?>/)
	      doc = Nokogiri::HTML(stop_description)
	      items = doc.css('ul li').map(&:text)
	      items.join(', ')
	    else
	      ActionView::Base.full_sanitizer.sanitize(stop_description)
	    end
	end
end
