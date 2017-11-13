class WebpagesController < ApplicationController
	def index
		@units = current_community.units.to_json
	end
end