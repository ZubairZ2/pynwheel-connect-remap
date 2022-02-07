class Igloohome < ApplicationRecord
  require 'csv'

  belongs_to :community
  has_many :igloohome_locks, dependent: :destroy

  def as_json
    super(
      :only => [:id, :username, :password]
    )
  end

  def import_data file
    if file.path.split('.').last.include?("csv")
      CSV.foreach(file.path, headers: true) do |row|
        save_lock_info(row) if self.community.present?
      end
    end
  end

  private

  def save_lock_info lock_row
    igloohome_lock = self.igloohome_locks.find_by(device_id: lock_row[1]) if lock_row[1].present?
    
    unless igloohome_lock.present?
      self.igloohome_locks.create!(device_name: lock_row[0], device_id: lock_row[1]) if lock_row[0].present? && lock_row[1].present?
    end
  end
end