class ElevatorBanksController < ApplicationController
  
  def assign_lock
    binding.pry
  end

  private

    def set_elevator
      @elevator = Elevator.find params[:id]
    end

    def elevator_bank_params
      params.require(:name, :position, :lock_name, :lock_type, :lock_id).permit!
    end
end
