class NotifyManagerService < BaseService
  attr_reader :before_updation_units

  NOTIFY_MANAGER_EMAIL_SUBJECT = "IMPORTANT- new units have been added to your self-guided tour".freeze
  NOTIFY_MANAGER_EMAIL_TEMPLATE = "Hello!
    <br>The following units have been added to Pynwheel Self Tour because their status changed to 'ready' in your property management system:
    <ul>%s</ul>
    If any of these units are not ready for visitors, please make sure to change the status in your property management ASAP!
    <br>
    Thank you!".freeze

  def initialize(before_update_units)
    @before_updation_units = before_update_units.uniq.pluck(:id, :unit_status).to_h
  end

  def compare_status_and_notify
    community_ids = updated_communities_with_units
    notify_manager(community_ids)
  end

  def notify_manager(community_ids)
    communities = Community.includes(:units).where(id: community_ids)

    communities.each do |community|
      available_units = community.units.vacant_and_available

      next unless available_units.present?

      recipients = [community.email, community.property_manager_email]
      email_body = generate_email_body(available_units)

      recipients.each do |recipient|
        send_notification_email(recipient, community, email_body)
      end
    end
  end

  private

  def updated_communities_with_units
    # Unit.where(id: @before_updation_units.keys)
    #     .where.not(unit_status: @before_updation_units.values)
    #     .where(unit_status: UNIT_STATUSES)
    #     .pluck(:community_id)
    #     .uniq

    community_ids = []
    after_updation_units = Unit.where(id: @before_updation_units.keys).uniq

    after_updation_units.each do |updated_unit|
      if UNIT_STATUSES.include?(updated_unit.unit_status) && (updated_unit.unit_status != @before_updation_units[updated_unit.id])
        community_ids << updated_unit.community_id
      end
    end

    community_ids.uniq
  end

  def generate_email_body(units)
    units_list = units.map { |unit| "<li>#{unit.marketing_name}</li>" }.join
    format(NOTIFY_MANAGER_EMAIL_TEMPLATE, units_list)
  end

  def send_notification_email(recipient, community, email_body)
    NotificationMailer.notify_property_manager(
      NOTIFY_MANAGER_EMAIL_SUBJECT,
      email_body,
      recipient,
      "support@pynwheel.com",
      community,
      false
    ).deliver
  end
end
