class CompaniesController < ApplicationController
  load_and_authorize_resource
  add_breadcrumb "Home", :root_path
  add_breadcrumb "Companies", :root_path
  before_action :set_company , only: [:edit,:update,:destroy]
  before_action :check_current_company , except: [:new,:create]
  def index
    if current_user.is_super_admin?
      @companies = Company.all
    else
      @companies = Company.where(id: current_user.company_id)
    end
  end

  def new
    add_breadcrumb "Add Company", new_company_path
    @company = Company.new
  end

  def create
    @company = Company.new(company_params)
    if @company.save
      flash[:notice] = "Company created successfully."
      redirect_to companies_path
    else
      flash[:error] = @company.errors.full_messages.join(',')
      render :new
    end
  end

  def edit
    add_breadcrumb "Edit Company", edit_company_path(@company)
  end

  def update
    if @company.update(company_params)
      flash[:notice] = "Company updated successfully."
      redirect_to companies_path
    else
      flash[:error] = @company.errors.full_messages.join(',')
      render :edit
    end
  end

  def destroy
    @company.destroy
    flash[:notice] = "Company deleted successfully."
    redirect_to companies_path
  end

  def check_current_company
    redirect_to new_company_path if current_company.nil?
  end

  private
  def set_company
    @company = Company.find params[:id]
  end
  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone,:logo)
  end

end