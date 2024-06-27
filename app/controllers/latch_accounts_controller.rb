class LatchAccountsController < ApplicationController
  before_action :set_latch_account, except: [:new, :remove_latch_locks]
  before_action :update_default_image, except: [:new, :remove_latch_locks]

  def new
    @latch = Latch.new
  end

  def create
    if @latch.update(latch_params)
      add_lock_provider
      flash[:notice] = "Latch credentials saved successfully"
    else
      flash[:error] = @latch.errors.full_messages.join(', ')
    end
    redirect_to new_community_dwelo_path
  end

  def upload_lock_image
    if params[:type].present? && params[:type] === "amenity"
      @latch.update(amenity_lock_image: params[:amenity_lock_image]) if params[:amenity_lock_image].present?
    else
      @latch.update(lock_image: params[:lock_image]) if params[:lock_image].present?
    end
  end

  def remove_latch_locks
    if current_community.latch&.latch_locks&.destroy_all
      flash[:notice] = "Latch locks deleted successfully"
    else
      flash[:error] = current_community.latch.present? ? "No locks are present" : "Credentials for Latch are missing"
    end

    redirect_to new_community_dwelo_path(current_community)
  end

  def test_latch_connection
    if current_community.enable_locks and current_community.multiple_locks_provider.include?("Latch") and current_community.latch.present?
      response = LatchOpenkit::LatchLocksService.new(nil, current_community.id).test_connection()
      render :xml => response
    else
      flash[:error] = "Please enter the Latch credentials before testing data."
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  def import_latch_locks
    if current_community.enable_locks and current_community.multiple_locks_provider.include?("Latch") and current_community.latch.present?
      response = LatchOpenkit::LatchLocksService.new(nil, current_community.id).test_connection()

      if response[:status] == :OK
        ImportLatchLocksWorker.perform_async current_community&.id        
        flash[:notice] = "Import of latch locks has begun. The process will be completed shortly"
      else
        flash[:error] = response[:message]
      end
    else
      flash[:error] = "Please enter the Latch credentials before testing data."
    end

    redirect_to new_community_dwelo_path(current_community)
  end

  def map_latch_locks
    @latch.map_locks_with_stops
    flash[:notice] =  "Locks are automapped successfully."
    redirect_to new_community_dwelo_path(current_community)
  end


  def destroy
    @latch = Latch.find(params[:id])
    @latch.destroy
    redirect_to new_community_dwelo_path(current_community), notice: 'Latch account successfully destroyed.'
  end

  private

    def update_default_image

      if @latch.amenity_lock_image.blank?
        default_image_base64 = image_to_base64("latch-lock-image-amenity.png")
        @latch.update(amenity_lock_image: default_image_base64)
      end

      if @latch.lock_image.blank?
        default_image_base64 = image_to_base64("latch-lock-image-unit.png")
        @latch.update(lock_image: default_image_base64)
      end
    end

    def image_to_base64(filename)
      image_path = Rails.root.join('app', 'assets', 'images', filename)
      image_data = File.read(image_path)
      base64_image = Base64.strict_encode64(image_data)
      "data:image/png;base64,#{base64_image}"
    end

    def add_lock_provider
      locks_provider = current_community.multiple_locks_provider

      unless locks_provider.include?("Latch")
        locks_provider << "Latch"
        current_community.update_columns(multiple_locks_provider: locks_provider)
      end
    end

    def set_latch_account
      @latch = Latch.find_or_initialize_by(community_id: current_community.id)
    end

    def latch_params
      params.require(:latch).permit(:latch_property_name, :community_id, :lock_instruction_text, :amenity_lock_instruction_text)
    end
end
