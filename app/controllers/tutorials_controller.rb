class TutorialsController < ApplicationController
  def index
  	
  	@tutorial = @community.tutorials
  end
  def destroy
  end
end
