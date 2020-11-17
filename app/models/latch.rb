class Latch < ApplicationRecord
    require 'csv'
    belongs_to :community
    has_many :latch_locks, dependent: :destroy

    def import_data(file)
        Thread.new do
            sleep 4
            execution_context = Rails.application.executor.run!
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
                notify_pusher({error: "Error in parsing " + "the uploaded CSV" + " file."})
            end
        ensure
            execution_context.complete! if execution_context
        end
    end

    def save_lock_info(community, lock_data)
        lock_name = lock_data[1]; lock_id = lock_data[2]; unit_data = lock_data[3];
        building_name, unit_name = unit_data.split('-') rescue nil
        unit_name , building_name = building_name, unit_name unless unit_name.present?

        unit = community.units.where('(marketing_name = ? or provider_unit_id = ?) and building = ?', unit_name, unit_name, building_name).first rescue nil
        lock = community.latch.latch_locks.find_by(lock_id: lock_id) rescue nil

        if lock_name.present? and lock_id.present? 
            if lock.nil? and unit.nil?
                LatchLock.create(lock_id: lock_id, lock_name: lock_name, latch_id: community.latch.id)
            elsif lock.present? and unit.nil?
                lock.update_attributes(lock_id: lock_id, lock_name: lock_name, latch_id: community.latch.id)
            else  # (lock.nil? and unit.present?) or (lock.present? and unit.present?)
                unit.latch_locks.destroy_all
                lock.destroy if lock.present?
                unit.latch_locks.create(lock_id:lock_id, lock_name: lock_name, latch_id: community.latch.id)
            end
        end
    end

    def notify_pusher(response)
        channel_name = "latch_channel_for_" + (self.community.name.gsub(/[^0-9a-z ]/i, '') + "_with_id_" + self.community.id.to_s).gsub(' ', '_')
        Pusher.trigger(channel_name, 'data-import', response.as_json)
    end
end
