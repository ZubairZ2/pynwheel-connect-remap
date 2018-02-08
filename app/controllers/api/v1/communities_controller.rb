class Api::V1::CommunitiesController < ActionController::Base
	before_action :set_community, only: [:data,:email_favorites]

	def login
		begin
			str = params[:community_string].split("@")
			company = Company.find_by_name(str[0])
			if company.present?
				community = company.communities.where(name: str[1])
				if community.present?
					render :json=> {:success=>true, :community => community.first.id, :message => "success", :operation => "login"}
				else
					render :json=> {:success=>false, :message => "Community not found"}
				end
			else
				render :json=> {:success=>false, :message => "Community not found"}
			end
		rescue Exception => e   
			render :json=> {:success=>false, :message => e.message}, :status=>500
		end
	end

	def data
	end

	def email_favorites
		begin
			if @community.email_favorites(params) == true
				render :json=> {:success=>true, :message => "success", :operation => "email favorites"}
			else
				render :json=> {:success=>false, :message => "email failed"}
			end
		rescue Exception => e   
			render :json=> {:success=>false, :message => e.message}, :status=>500
		end
	end

	def list_communities
		@communities = Community.all
	end

	private
	def set_community
		@community = Community.find(params[:id])
	end
end