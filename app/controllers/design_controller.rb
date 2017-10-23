class DesignController < ApplicationController
	before_action :set_community
	add_breadcrumb "Home", :root_path

	def index
		add_breadcrumb "Design", community_design_index_path(@community)
		@design = current_community.design || current_community.create_design
		@menu = @design.menu ||  @design.create_menu
		@main_screen = @design.main_screen ||  @design.create_main_screen
		@home_screen = @design.home_screen ||  @design.create_home_screen	
	end

	# def rgb2hex(blue)
	#   @blue_as_hex = ""

 #       blue.each do |component|
 #         hex = component.to_s(16)
 #         if component < 10
 #           @blue_as_hex << "0#{hex}"
 #          else
 #           @blue_as_hex << hex
 #         end
 #        end
 #        return @blue_as_hex
 #    end

	private 

	def set_community
		@community = Community.find params[:community_id]
	end
end