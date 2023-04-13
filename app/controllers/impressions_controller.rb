class ImpressionsController < ApplicationController
  before_action :set_impression , only: [:edit,:destroy_impression]

  def index
    @community = Community.find params[:community_id]
    @impressions = Impression.all.paginate(page: params[:page], per_page: 20)
  end

  def edit
  end

  def destroy_impression
    @impression.destroy!
    redirect_to community_impressions_path, notice: 'Impression deleted.'
  end

  private
  def set_impression
    @impression = Impression.find(params[:id])
  end
end
