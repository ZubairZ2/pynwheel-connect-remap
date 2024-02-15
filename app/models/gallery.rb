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

    begin
      if stop_description.match?(/<ul\b.*?>|<ol\b.*?>/)
        doc = Nokogiri::HTML(stop_description)
        items = doc.css('ul li, ol li').map(&:text)
        list_text = items.join(",\n")
        list_text = "\n#{list_text}\n"
        formatted_string = stop_description.gsub(/<ul\b.*?>.*?<\/ul>|<ol\b.*?>.*?<\/ol>/, list_text)
        ActionView::Base.full_sanitizer.sanitize(formatted_string)
      else
        ActionView::Base.full_sanitizer.sanitize(stop_description)
      end
    rescue
      ActionView::Base.full_sanitizer.sanitize(stop_description)
    end
  end
end
