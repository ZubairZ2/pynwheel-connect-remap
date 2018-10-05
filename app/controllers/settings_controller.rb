	class SettingsController < ApplicationController
	add_breadcrumb "Home", :root_path
	before_action :check_community

  before_action :set_community
	def index
		authorize! :add_settings,current_user
		add_breadcrumb "Data", community_settings_path(@community)
		@communities = current_company.communities
	end
	private
	def set_community
		@community = Community.find params[:community_id]
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
end