class ElevatorBank < ApplicationRecord
  belongs_to :elevator
  after_save :assign_multiple_locks

  private

    def assign_multiple_locks
      lock_ids = elevator.elevator_banks.pluck(:lock_id)

      LatchLock.where(stop_id: elevator.id).update_all(stop_id: nil, stop_type: nil)

      if lock_ids.present?
        latch_locks = LatchLock.where(lock_id: lock_ids, latch_id: elevator.community.latch.id)
        latch_locks.update_all(stop_id: elevator.id, stop_type: elevator.class.name)
        elevator.update_column(:lock_provider, "Latch")
      else
        elevator.update_column(:lock_provider, "")
      end
    end
end
