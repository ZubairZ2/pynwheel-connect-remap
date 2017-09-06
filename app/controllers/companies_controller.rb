class CompaniesController < ApplicationController

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

end