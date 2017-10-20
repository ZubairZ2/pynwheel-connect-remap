class Api::V1::CommunitiesController < ActionController::Base
	before_action :set_community, only: [:data]

	def login
		begin
			str = params[:community_string].split("@")
			company = Company.find_by_name(str[0])
			if company.present?
				community = company.communities.where(name: str[1])
				if community.present?
					render :json=> {:success=>true, :community => community.first.id}, :status => 200
				else
					render :json=> {:success=>false, :message => "Community not found"}, :status=>404
				end
			else
				render :json=> {:success=>false, :message => "Community not found"}, :status=>404
			end
		rescue Exception => e   
			render :json=> {:success=>false, :message => e.message}, :status=>500
		end
	end

	def data
	end

	private
	def set_community
		@community = Community.find(params[:id])
	end
end