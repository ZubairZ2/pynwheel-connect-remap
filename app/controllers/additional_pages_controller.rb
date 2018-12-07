class AdditionalPagesController < ApplicationController
	before_action :set_community
	before_action :check_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Additional Pages", community_additional_pages_path(@community)
		webpages = @community.webpages
		imagepages = @community.imagepages
		@pages = webpages + imagepages
	end

  def check_community
    unless current_user.is_super_admin?
      if params[:community_id].present?
        all_ids = []
        current_user.communities.each do |c|
          # all_ids.insert(c.id)
          all_ids << c.id
        end
        # byebug
        # puts '+++++++++++++++', all_ids[0]
        if all_ids.include? params[:community_id].to_i

        else
          redirect_to root_path
        end
      end
    end
  end
	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end