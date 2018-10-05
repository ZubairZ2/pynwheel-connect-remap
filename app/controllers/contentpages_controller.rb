class ContentpagesController < ApplicationController
	before_action :set_community
	before_action :check_community
	add_breadcrumb "Home", :root_path

	def new
		@webpage = @community.webpages.new
	end

	def create
		@webpage = @community.webpages.new(webpage_params)

		
     	#  	if @webpage.url.include? '</iframe>'
		   #  @iframe_url = @webpage.url.split('height')
		   #  if @iframe_url[1][3] == '"'
		   #    @iframe_url[1][2] = '1' + '0' + '0' + '%'
		   #  elsif @iframe_url[1][4] == '"'
		   #    @iframe_url[1][2] = '1'
		   #    @iframe_url[1][3] = '0' + '0' + '%'
		   #  elsif @iframe_url[1][5] == '"'
		   #    @iframe_url[1][2] = '1'
		   #    @iframe_url[1][3] = '0'
		   #    @iframe_url[1][4] = '0' + '%'
		   #  else
		   #    @iframe_url[1][2] = '1'
		   #    @iframe_url[1][3] = '0'
		   #    @iframe_url[1][4] = '0'
		   #    @iframe_url[1][5] = '%'
		   #  end
		   #  @webpage.url = @iframe_url[0] + 'height' + @iframe_url[1]
		   #  puts '******************************* ' , @webpage.url
    	# end

    if @webpage.save
      flash[:notice] = "Webpage created successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
	end
	def check_community
		unless current_user.is_super_admin?
			all_ids = []
			current_user.communities.each do |c|
				# all_ids.insert(c.id)
				all_ids << c.id
			end
			# byebug
			# puts '+++++++++++++++', all_ids[0]
			if all_ids.include? params[:community_id].to_i

			else
				raise ActionController::RoutingError.new('Not Found')
			end
		end
	end
	def edit
		@webpage = @community.webpages.find(params[:id])
	end

	def update
		@webpage = @community.webpages.find(params[:id])
		@webpage.position = nil unless params[:webpage][:position].present?
    if @webpage.update_attributes(webpage_params)
      flash[:notice] = "Webpage updated successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
	end

	def destroy
		@webpage = @community.webpages.find(params[:id])
    if @webpage.destroy
      flash[:notice] = "Webpage deleted successfully."
    else
      flash[:error] = @webpage.errors.full_messages.join(',')
    end
    redirect_to community_additional_pages_path(@community)
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

	def webpage_params
		params.require(:webpage).permit(:name,:url,:hide_page,:display_on_homepage,:position)
	end
end