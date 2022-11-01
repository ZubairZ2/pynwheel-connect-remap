class Latch < ApplicationRecord
  require 'csv'
  belongs_to :community
  has_many :latch_locks, dependent: :destroy
  has_one :status, as: :statusable
  mount_uploader :file, CsvfileUploader

  def as_json options = {}
    super(
      :only => [:id, :client_id, :client_secret, :file ], :method => [:lock_type]
    )
  end

  def lock_type
    return LATCH
  end

  def import_data(file)
      Thread.new do
          execution_context = Rails.application.executor.run!
          clear_locks_provider(community)
          begin
              if file.path.split('.').last.include?("csv")
                  names_with_ids = Community.pluck(:id,:name).map{|x| [x[0], x[1].downcase.gsub(/([-() ])/, '')]}
                  CSV.foreach(file.path, headers: true) do |row|
                      community = Community.find_by_name row[0]
                      if community.present?
                          save_lock_info(community,row)
                      else
                          id = names_with_ids.map{|n| n[0] if n[1] == row[0].downcase.gsub(/([-() ])/, '')}.compact
                          community = Community.find_by_id id.first
                          if community.present?
                              save_lock_info(community, row)
                          end
                      end
                  end
                  notify_pusher({success: "Locks are imported successfully."})
              else
                  notify_pusher({error: "Invalid File"})
              end
          rescue => exception
              puts "--------------------------- an error occured -----------------------------"
              notify_pusher({error: "Error in parsing " + "the uploaded CSV" + " file."})
          end
      ensure
          execution_context.complete! if execution_context
      end
  end

  def save_lock_info(community, lock_data)
      lock_name = lock_data[1]; lock_id = lock_data[2]; stop_data = lock_data[3]; door_uuid = lock_data[4];

      data = parse_stop(stop_data)
      lock = community.latch.latch_locks.find_by(door_uuid: door_uuid) rescue nil

      if lock_name.present? and lock_id.present? and door_uuid.present?
          if lock.nil? and data.nil?
              LatchLock.create(door_uuid: door_uuid, lock_name: lock_name, latch_id: community.latch.id, lock_id: lock_id)
          elsif lock.present? and data.nil?
              lock.update_attributes(lock_id: lock_id, lock_name: lock_name, latch_id: community.latch.id)
          else  # (lock.nil? and data.present?) or (lock.present? and data.present?)
              data.latch_locks.map{|l| l.update_attributes(stop_type: nil, stop_id: nil)}
              lock.destroy if lock.present?
              data.latch_locks.create(door_uuid: door_uuid, lock_name: lock_name, latch_id: community.latch.id, lock_id:lock_id)
              data.update_column(:lock_provider, "Latch")
          end
      end
  end


    def clear_locks_provider(community)
        community.units.where(lock_provider: "Latch").update_all(lock_provider: "")
        community.amenities.where(lock_provider: "Latch").update_all(lock_provider: "")
        community.elevators.where(lock_provider: "Latch").update_all(lock_provider: "")
        community.building_starting_point.where(lock_provider: "Latch").update_all(lock_provider: "")
        community.community_tour.update(lock_provider: "") if community.community_tour.lock_provider === "Latch"
        community.doors.where(lock_provider: "Latch").update_all(lock_provider: "")
    end


  def parse_stop(stop_name)
      data=nil

      if stop_name.include?('-')
          building_name, unit_name = stop_name.split('-',2)
      else
          building_name = nil
          unit_name = stop_name
      end

      if building_name == nil
          building_name_ = ''
      else
          building_name_ = building_name
      end

      data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and (building = ? or building = ?)', unit_name, unit_name, building_name, building_name_).first rescue nil
      data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and (building = ? or building = ?)', stop_name, stop_name, nil, '').first rescue nil unless data.present?

      data = community.doors.where(name: stop_name).first if data.nil?
      data = community.amenities.where(name: stop_name).first if data.nil?
      data = community.elevators.where(name: stop_name).first if data.nil?
      data = community.building_starting_point.where(name: stop_name).first if data.nil?
      data = community.community_tour.name == stop_name ? community.community_tour : nil if data.nil?

      if data.nil? and stop_name.count('-') > 1
          (stop_name.count('-')+1).times.each do |i|
              if i >= 2
                  building = (stop_name.split('-', i+1).first ((stop_name.split('-', i+1).length) -1)).join('-')
                  unit_name = stop_name.split('-', i+1).last
                  data = community.units.where('(marketing_name = ? or provider_unit_id = ?) and building = ?', unit_name, unit_name, building).first rescue nil
              end
              break if data.present?
          end
      end

      return data
  end

  def notify_pusher(response)
      channel_name = "latch_channel_for_" + (self.community.name.gsub(/[^0-9a-z ]/i, '') + "_with_id_" + self.community.id.to_s).gsub(' ', '_')
      Pusher.trigger(channel_name, 'data-import', response.as_json)
  end
end