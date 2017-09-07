class CompaniesController < ApplicationController

  def index
    @companies = Company.all
  end

  def new
    @company = Company.new
  end

  def create
    @company = Company.new(company_params)
    if @company.save
      flash[:notice] = "@company created successfully."
      redirect_to root_path
    else
      flash[:notice] = @company.errors.full_messages.join(',')
      render :new
    end
  end

  private
  def company_params
    params.require(:company).permit(:name,:address,:city,:state,:zip,:email,:phone,:logo)
  end

end