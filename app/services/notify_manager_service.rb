class NotifyManagerService < BaseService
  attr_reader :before_update_units

  def initialize(before_update_units)
    @before_updation_units = before_update_units.uniq.pluck(:id, :unit_status).to_h
  end

  def compare_status_and_notify
    community_ids = []
    after_updation_units = Unit.where(id: @before_updation_units.keys).uniq

    after_updation_units.each do |updated_unit|
      if UNIT_STATUSES.include?(updated_unit.unit_status) && (updated_unit.unit_status != @before_updation_units[updated_unit.id])
        community_ids << updated_unit.community_id
      end
    end
    
    notify_manager(community_ids.uniq)
  end

  def notify_manager(community_ids)
    communities = Community.where(id: community_ids)

    communities.each do |community|
      recipients = [community.email, community.property_manager_email]
      available_units = community.units.vacant_and_available

      subject = "IMPORTANT- new units have been added to your self-guided tour"
      body = "Hello!
      <br>The following units have been added to Pynwheel Self Tour because their status changed to 'ready' in your property management system:
      <ul>#{available_units.map { |unit| "<li>#{unit.marketing_name}</li>" }.join}</ul>
      If any of these units are not ready for visitors, please make sure to change the status in your property management ASAP!
      <br>
      Thank you!"

      if available_units.present? 
        recipients.each do |recipient|
          NotificationMailer.notify_property_manager(subject, body, recipient, "support@pynwheel.com", community, false).deliver
        end
      end
    end

  end
end