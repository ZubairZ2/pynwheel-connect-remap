class CompanySettingsController < ApplicationController
  before_action :find_company_setting, only: [ :edit, :update]
  before_action :set_company_credentials, only: [ :edit, :new]

  def new
    @company_setting = CompanySetting.new
  end

  def create
    @company_setting = CompanySetting.new(company_setting_params)
    if @company_setting.save
      flash[:notice] = "Company settings created successfully!"
      redirect_to edit_company_company_setting_path(current_company,@company_setting,community_id: current_community&.id)
    else
      render :new
    end
  end

  def edit
  end

  def update
    if @company_setting.update(company_setting_params)
      flash[:notice] = "Company settings updated successfully!"
      redirect_to edit_company_company_setting_path(current_company,@company_setting,community_id: current_community&.id)
    else
      render :edit
    end
  end

  private

  def find_company_setting
    @company_setting = CompanySetting.find(params[:id])
  end

  def set_company_credentials
    @company = Company.find params[:company_id]
    unless @company&.credential.present?
      @company.build_credential
    end
  end

  def company_setting_params
    params.require(:company_setting).permit(:pynwheel_launch_access, :company_level_data_import, :company_id)
  end
end
