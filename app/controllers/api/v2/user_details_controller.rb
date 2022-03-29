class Api::V2::UserDetailsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_company , only: :update_company
  before_action :load_community, only: :get_company
  before_action :load_user, only: :get_company_by_user

  def get_company
    if @community.present?
      render :json => {:success => true, data: @community.company.as_json}
    else
      render :json => {:success => false, message: "Community not present"}
    end
  end

  def get_company_by_user
    if @user.present?
      render :json => {:success => true, data: @user.company.as_json}
    else
      render :json => {:success => false, message: "User not found"}
    end
  end

  def update_company
    if @company.update(company_params)
      @company.set_company_details_status(current_pynwheel_user)
      render :json => {:success => true , data: @company.as_json, :message => "Company updated succesfully."}
    else
      render :json => {:success => false, :message => @company.errors.full_messages}
    end
  end

  private

  def load_user
    @user = User.find_by_id(params[:id])
  end

  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone)
  end

  def load_company
    @company = Company.find_by_id(params[:id])
  end

  def load_community
    @community = Community.find_by_id(params[:community_id])
  end

end
