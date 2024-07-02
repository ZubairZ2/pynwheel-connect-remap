class IgloohomeAccountsController < ApplicationController
  before_action :create_igloohome_account, except: [:remove_igloohome_locks] 

  def create
    @igloohome.update(version: params.dig(:igloohome, :version)) if params.dig(:igloohome, :version).present?
  end

  def add_lock_instructions
    return unless params[:igloohome].present?
    @igloohome.update(lock_instruction_text: params[:igloohome][:lock_instruction_text]) if params[:igloohome][:lock_instruction_text].present?
    @igloohome.update(amenity_lock_instruction_text: params[:igloohome][:amenity_lock_instruction_text]) if params[:igloohome][:amenity_lock_instruction_text].present?

    flash[:notice] = "Igloohome lock instructions updated successfully!"
    redirect_to new_community_dwelo_path(current_community)
  end

  def upload_lock_image
    if params[:type].present? && params[:type] === "amenity"
      @igloohome.update(amenity_lock_image: params[:amenity_lock_image]) if params[:amenity_lock_image].present?
    else
      @igloohome.update(lock_image: params[:lock_image]) if params[:lock_image].present?
    end
  end

  def remove_igloohome_locks 
    if current_community&.igloohome&.igloohome_locks.present?
      current_community.igloohome.igloohome_locks.destroy_all
      flash[:notice] = "Igloohome locks deleted successfully"
    else
      flash[:error] = "No Igloohome locks are present"
    end

    redirect_to new_community_dwelo_path(current_community)
  end

  private

  def create_igloohome_account
    @igloohome = Igloohome.find_or_create_by(community_id: params[:community_id]) do |igloohome|
      igloohome.username = "testing igloohome lock"
      igloohome.password = "igloohome password"
    end
  end
end
