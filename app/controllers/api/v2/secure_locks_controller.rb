class Api::V2::SecureLocksController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: %i[index add_secure_locks]

  def index
    locks = get_all_locks
    if locks.any?
      render json: { success: true, data: locks.as_json }
    else
      render json: { success: false, message: 'No locks added yet!' }
    end
  end

  def add_secure_locks
    begin
      @locks_provider = @community.multiple_locks_provider
      lock_params = params['secure_locks']
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
      end
      unique_locks_provider = @locks_provider.uniq
      @community.update_attributes(multiple_locks_provider: unique_locks_provider)
      @community.set_lock_providers_status(current_pynwheel_user)
      locks = get_all_locks
      render json: { status: true, data: locks.as_json }
    rescue => e
      render json: { status: false, message: e.message }
    end
  end

  private

  def yale_lock(lock_id, lock)
    if !lock_id.present?
      community_edge_state = @community.edge_state
      edge_state_lock = community_edge_state.present? ? community_edge_state : @community.create_edge_state
      if edge_state_lock.present? && !edge_state_lock.yale.present?
        edge_state_lock.yale.create
        @locks_provider << REMOTELOCK
      end
    end
  end

  def remote_lock(lock_id, lock)
    if !lock_id.present?
      community_edge_state = @community.edge_state
      edge_state_lock = community_edge_state.present? ? community_edge_state : @community.create_edge_state
      if edge_state_lock.present? && !edge_state_lock.remote_locks.present?
        edge_state_lock.remote_locks.create
        @locks_provider << REMOTELOCK
      end
    end
  end

  def schlage_lock(lock_id, lock)
    if lock_id.present?
      schlage_lock = @community.edge_state.schlage.find_by(id: lock_id)
      if schlage_lock.present?
        @community.edge_state.schlage.update(email: lock['email'], password: lock['password'], image: lock["file"])
      end
    else
      community_edge_state = @community.edge_state
      edge_state_lock = community_edge_state.present? ? community_edge_state : @community.create_edge_state
      if edge_state_lock.present?
        edge_state_lock.schlage.create(email: lock['email'], password: lock['password'], image: lock["file"])
        @locks_provider << SCHLAGELOCK
      end
    end
  end

  def dwelo_lock(lock)
    unless @community.dwelo.present?
      @community.build_dwelo(client_id: lock['client_id'], client_secret: lock['client_secret'])
      @locks_provider << DWELO
    else
      @community.dwelo.update(client_id: lock['client_id'], client_secret: lock['client_secret'])
    end
  end

  def latch_lock(lock)
    unless @community.latch.present?
      @community.create_latch(client_id: lock['client_id'], client_secret: lock['client_secret'], file: lock["file"])
    else
      @community.latch.update(client_id: lock['client_id'], client_secret: lock['client_secret'], file: lock["file"])
    end
  end

  def igloo_home_lock(lock)
    unless @community.igloohome.present?
      @community.create_igloohome(email: lock['email'], file: lock["file"])
    else
      @community.igloohome.update_attributes(email: lock['email'], file: lock["file"])
    end
  end

  def zerv_lock(lock)
    unless @community.zerv.present?
      @community.create_zerv(facility_id: lock['facility_id'], badge_id: lock['badge_id'], card_format: lock['card_format'])
    else
    @community.zerv.update(facility_id: lock['facility_id'], badge_id: lock['badge_id'], card_format: lock['card_format'])
    end
  end

  def get_all_locks
    edge_state = @community.edge_state
    dwelo = @community.dwelo
    latch = @community.latch
    zerv = @community.zerv
    igloo_home = @community.igloohome
    locks = []
    if edge_state.present?
      remote_lock = RemoteLock.where(edge_state_id: edge_state.id)
      locks << { type: REMOTELOCK } if remote_lock.present?
      yale_lock = Yale.where(edge_state_id: edge_state.id)
      locks << { type: YALELOCK } if yale_lock.present?
      schlage_lock = Schlage.where(edge_state_id: edge_state.id)
      locks << { type: SCHLAGELOCK, details: schlage_lock } if schlage_lock.present?
    end
    locks << { type: DWELO, details: dwelo } if dwelo.present?
    locks << { type: LATCH, details: latch } if latch.present?
    locks << { type: ZERV, details: zerv } if zerv.present?
    locks << { type: IGLOOHOME, details: igloo_home } if igloo_home.present?
    locks
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil },
           status: :not_found
  end
end
