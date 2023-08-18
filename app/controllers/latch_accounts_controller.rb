class LatchAccountsController < ApplicationController
  before_action :set_latch_account, except: [:new, :remove_latch_locks]

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
    return unless params[:lock_image].present?

    @latch.update(lock_image: params[:lock_image])
  end

  def remove_latch_locks
    if current_community.latch&.latch_locks&.destroy_all
      flash[:notice] = "Locks deleted successfully"
    else
      flash[:error] = current_community.latch.present? ? "No locks are present" : "Credentials for Latch are missing"
    end

    redirect_to new_community_dwelo_path(current_community)
  end

  def test_latch_connection
    if current_community.enable_locks and current_community.multiple_locks_provider.include?("Latch") and current_community.latch.present?
      response = LatchOpenkit::LatchLocksService.new(nil, current_community.id).get_latch_buildings_list()
      render :xml => response
    else
      flash[:error] = "Please enter the Latch credentials before testing data."
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  def destroy
    @latch = Latch.find(params[:id])
    @latch.destroy
    redirect_to new_community_dwelo_path(current_community), notice: 'Latch account successfully destroyed.'
  end

  private

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
    params.require(:latch).permit(
      :passwordless_client_id, :passwordless_client_secret,
      :client_id, :client_secret, :community_id, :lock_instruction_text
    )
  end
end
