class ImpressionsController < ApplicationController
  before_action :load_impression , only: [:show,:destroy]

  def index
    @impressions = Impression.all.paginate(page: params[:page], per_page: 20)
  end

  def show
  end

  def destroy
    if @impression.destroy!
      redirect_to community_impressions_path, notice: 'Impression deleted successfully'
    else
      redirect_to community_impressions_path, error: 'Something went wrong.'
    end
  end

  private

  def load_impression
    @impression = Impression.find params[:id]
    rescue ActiveRecord::RecordNotFound
      redirect_to community_impressions_path, error: "Impression not found with id #{params[:id]}"
  end
end
