class ElevatorBanksController < ApplicationController
  before_action :set_community
  before_action :set_elevator
  before_action :set_elevator_bank, only: [:update, :destroy]
  before_action :set_provider, only: [:create, :update]

  def create
    elevator_bank = @elevator.elevator_banks.new(elevator_bank_create_params)
    
    if elevator_bank.save
      render json: {message: 'Elevator created successfully.', status: :OK}
    else
      render json: {message: 'Failed to create elevator.', status: :unprocessable_entity}
    end
  end

  def update
    if @elevator_bank.update(elevator_bank_update_params)
      render json: {message: 'Elevator updated successfully.', status: :OK}
    else
      render json: {message: 'Failed to update elevator.', status: :unprocessable_entity}
    end
  end

  def destroy
    if @elevator_bank.destroy
      render json: {message: 'Elevator deleted successfully.', status: :OK}
    else
      render json: {message: 'Failed to delete elevator.', status: :unprocessable_entity}
    end
  end

  private

    def set_provider
      @elevator.update(lock_provider: params[:lock_type])
    end

    def set_elevator_bank
      @elevator_bank = @elevator.elevator_banks.find_by(id: params[:id])
    end

    def set_elevator
      @elevator = @community.elevators.find(params[:elevator_id])
    end

    def set_community
      @community = Community.find(params[:community_id])
    end

    def elevator_bank_create_params
      params.permit(:name, :position, :lock_name, :lock_type, :lock_id)
    end

    def elevator_bank_update_params
      params.permit(:name, :position, :lock_name, :lock_type, :lock_id)
    end
end
