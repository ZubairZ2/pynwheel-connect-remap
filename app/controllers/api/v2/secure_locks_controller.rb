class Api::V2::SecureLocksController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: %i[index add_secure_locks delete_secure_lock remove_igloohome_auth_account]

  def index
    locks = get_all_locks
    if locks.any?
      render json: { success: true, data: locks.as_json }
    else
      render json: { success: false, message: 'No locks added yet!' }
    end
  end

  def remove_igloohome_auth_account
    if @community.igloohome.present?
      if @community.igloohome.refresh_token.present?
        @community.igloohome.update_attributes(refresh_token: nil, is_authorized_with_pynwheel: false)
        render json: { success: true, message: "Account disconnected successfully" }
      else
        render json: { success: false, message: "No account is attached" }
      end
    else
      render json: { success: false, message: "Credentials for igloohome are missing" }
    end
  end

  def add_secure_locks
    begin
      @locks_provider = @community.multiple_locks_provider
      lock_params = params['secure_locks']
      @status = params["status"]
      lock_params.values.each do |lock|
        type = lock['type']
        lock_id = lock['id']
        schlage_lock(lock_id, lock) if type.eql?(SCHLAGELOCK)
        remote_lock(lock_id, lock) if type.eql?(REMOTELOCK)
        yale_lock(lock_id, lock) if type.eql?(YALELOCK)
        dwelo_lock(lock) if type.eql?(DWELO)
        latch_lock(lock) if type.eql?(LATCH)
        igloo_home_lock(lock) if type.eql?(IGLOOHOME)
        zerv_lock(lock) if type.eql?(ZERV)
        other_lock(lock) if type.eql?(OTHERLOCK)
      end
      unique_locks_provider = @locks_provider.uniq
      @community.update_attributes(multiple_locks_provider: unique_locks_provider)
      previous_status = PynwheelLaunch::Communities::CommunityDetailForms.new(@community).check_status_of_specific_form(LOCK_PROVIDER) 
      @community.set_lock_providers_status(current_user, @status)
      FollowUpMailer.send_email_after_form_submission(@community, LOCK_PROVIDER, previous_status)
      locks = get_all_locks
      render json: { success: true, data: locks.as_json }
    rescue => e
      render json: { success: false, message: e.message }
    end
  end

  def delete_lock_files
    success = false
    @type = params["type"]
    success = delete_latch_file if @type.eql?(LATCH)
    success = delete_schlage_file if @type.eql?(SCHLAGELOCK)
    success = delete_igloohome_file if @type.eql?(IGLOOHOME)
    if success
      render json: {success: true}
    end
  end

  def delete_secure_lock
    success = false
    @type = params["type"]

    success = delete_schlage_lock if @type.eql?(SCHLAGELOCK)
    success = delete_remote_lock if @type.eql?(REMOTELOCK)
    success = delete_yale_lock  if @type.eql?(YALELOCK)
    success = delete_dwelo_lock if @type.eql?(DWELO)
    success = delete_latch_lock  if @type.eql?(LATCH)
    success = delete_igloohome_lock if @type.eql?(IGLOOHOME)
    success = delete_zerv_lock if @type.eql?(ZERV)
    success = delete_other_lock if @type.eql?(OTHERLOCK)
    locks = get_all_locks
    if success
      render json: { success: success, data: locks.as_json }
    else
      render json: { success: false, message: "Failed to delete secure lock" }
    end
  end

  def send_latch_initation_email
    begin
      
      LatchInvitationMailer.send_latch_integration_invite_mail(params[:to_email], params[:from_email], params[:subject], params[:body]).deliver
      
      render json: { success: true, message: "Latch invitation email sent successfully!" }
      
    rescue => error
      render json: { success: false, message: error.message }
    end
  end

  def delete_latch_file
    lock = Latch.find_by_id(params["id"])
    if lock.present?
      lock.remove_file!
      lock.save
      return true
    end
  end

  def delete_schlage_file
    lock = Schlage.find_by_id(params["id"])
    if lock.present?
      lock.remove_image!
      lock.save
      return true
    end
  end

  def delete_igloohome_file
    lock = Igloohome.find_by_id(params["id"])
    if lock.present?
      lock.remove_file!
      lock.save
      return true
    end
  end

  def delete_latch_lock
    lock = Latch.find_by_id(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_yale_lock
    lock = Yale.find_by_id(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_remote_lock
    lock = LaunchRemote.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_schlage_lock
    lock = Schlage.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_dwelo_lock
    lock = Dwelo.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_igloohome_lock
    lock = Igloohome.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_zerv_lock
    lock = Zerv.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def delete_other_lock
    lock = OtherLock.find(params["id"])
    if lock.present?
      return true if lock.destroy!
    end
  end

  def yale_lock(lock_id, lock)
    if !lock_id.present?
      @community.create_yale
      @locks_provider << YALELOCK
    end
  end

  def remote_lock(lock_id, lock)
    if !lock_id.present?
    @community.create_launch_remote
    @locks_provider << REMOTELOCK
    end
  end

  def schlage_lock(lock_id, lock)
    if lock_id.present?
      schlage_lock = Schlage.find lock_id
      if schlage_lock.present?
        @community.schlage.update(email: lock['email'], password: lock['password'], image: lock["file"])
      end
    else
      @community.create_schlage(email: lock['email'], password: lock['password'], image: lock["file"]) if lock["file"].present?
      @community.create_schlage(email: lock['email'], password: lock['password']) unless lock["file"].present?
      @locks_provider << SCHLAGELOCK
    end
  end

  def dwelo_lock(lock)
    unless @community.dwelo.present?
      @community.build_dwelo(client_id: lock['client_id'], client_secret: lock['client_secret'], default_community_id: lock['community_id'])
      @locks_provider << DWELO
    else
      @community.dwelo.update(client_id: lock['client_id'], client_secret: lock['client_secret'], default_community_id: lock['community_id'])
    end
  end

  def latch_lock(lock)
    unless @community.latch.present?
      @community.create_latch(
        latch_property_name: lock['latch_property_name'], 
        is_building_name_added:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["0"]["checked"]),
        is_integration_submitted:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["1"]["checked"]),
        is_mission_control_setup:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["2"]["checked"])
      )
      @locks_provider << LATCH

    else
      @community.latch.update(
        latch_property_name: lock['latch_property_name'], 
        is_building_name_added:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["0"]["checked"]),
        is_integration_submitted:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["1"]["checked"]),
        is_mission_control_setup:  ActiveRecord::Type::Boolean.new.cast(lock["latch_check_box_options"]["2"]["checked"])
      )
    end
  end

  def igloo_home_lock(lock)
    @igloohome = get_igloohome_account
    if(lock['is_auth_code'].present?)
      @community.igloohome.update_attributes(home_name: lock['home_name'], is_authorized_with_pynwheel: lock['is_auth_code'])
    elsif(lock['is_client_auth'])
      @community.igloohome.update_attributes(home_name: lock['home_name'], is_authorized_with_pynwheel: false, client_id: lock['client_id'], client_secret: lock['client_secret'])
    end
  end

  def zerv_lock(lock)
    unless @community.zerv.present?
      @community.create_zerv(facility_id: lock['facility_id'], badge_id: lock['badge_id'], card_format: lock['card_format'], username: lock['username'], password: lock["password"])
      @locks_provider << ZERVCLIENT
    else
      @community.zerv.update(facility_id: lock['facility_id'], badge_id: lock['badge_id'], card_format: lock['card_format'], username: lock['username'], password: lock["password"])
    end
  end

  def other_lock(lock)
    if lock["id"].present?
      other_lock = OtherLock.find lock["id"]
      other_lock.update_attributes(description: lock["description"], area_type: lock["otherType"])
    else
      @community.other_locks.create(description: lock["description"], area_type: lock["otherType"])
      @locks_provider << OTHERLOCK
    end
  end

  def get_all_locks
    dwelo = @community.dwelo
    latch = @community.latch
    zerv = @community.zerv
    other_lock = @community.other_locks
    igloo_home = @community.igloohome
    remote_lock = @community.launch_remote
    yale_lock = @community.yale
    schlage_lock = @community.schlage
    locks = []
    locks << { type: REMOTELOCKCLIENT, details: remote_lock} if remote_lock.present?
    locks << { type: YALELOCKCLIENT, details: yale_lock } if yale_lock.present?
    locks << { type: SCHLAGELOCKCLIENT, details: schlage_lock } if schlage_lock.present?
    locks << { type: DWELO, details: dwelo } if dwelo.present?
    locks << { type: LATCHCLIENT, details: latch } if latch.present?
    locks << { type: ZERVCLIENT, details: zerv } if zerv.present?
    locks << { type: IGLOOHOMECLIENT, details: igloo_home } if igloo_home.present?
    locks << { type: OTHERLOCK, details: other_lock } if other_lock.present?
    locks
  end

  def get_igloohome_account
    Igloohome.find_or_create_by(community_id: @community&.id) do |igloohome|
      igloohome.username = "Username"
      igloohome.password = "Password"
      igloohome.version = "v2"
    end
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil },
          status: :not_found
  end
end
