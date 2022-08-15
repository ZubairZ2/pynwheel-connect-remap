class Api::V2::UserDetailsController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_company , only: :update_company

  def update_company
    if @company.update(company_params)
      @company.set_company_details_status(current_pynwheel_user, params["status"])
      render :json => {:success => true , data: @company.as_json, :message => "Company updated succesfully."}
    else
      render :json => {:success => false, :message => @company.errors.full_messages}
    end
  end

  private

  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone)
  end

  def load_company
    @company = Company.find_by_id(params[:id])
  end

end
