class Api::V2::SecureLocksController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: %i[ index add_secure_locks ]

  def index
    edge_state = @community.edge_state
    dwelo = @community.dwelo
    latch = @community.latch
    zerv = @community.zerv
    igloo_home = @community.igloohome
    @locks = []
    if edge_state.present?
      remote_lock = RemoteLock.find_by(edge_state_id: edge_state.id)
      @locks << { type: REMOTELOCK, details: remote_lock } if remote_lock.present?
      yale_lock = Yale.find_by(edge_state_id: edge_state.id)
      @locks << { type: YALELOCK, details: yale_lock } if yale_lock.present?
      schlage_lock = Schlage.find_by(edge_state_id: edge_state.id)
      @locks << { type: SCHLAGELOCK, details: schlage_lock } if schlage_lock.present?
    end
    @locks << { type: DWELO, details: dwelo } if dwelo.present?
    @locks << { type: LATCH, details: latch } if latch.present?
    @locks << { type: ZERV, details: zerv } if zerv.present?
    @locks << { type: IGLOOHOME, details: igloo_home } if igloo_home.present?
    if @locks.any?
      render json: { success: true, data: @locks.as_json }
    else
      render json: { success: false, message: 'No locks added yet!' }
    end
  end

  def add_secure_locks
    begin
      @locks = []
    lock_params = params['secure_locks']
    lock_params.values.each do |lock|
      type = lock['type']
      lock_id = lock['id']
      if type.eql?(REMOTELOCK) || type.eql?(YALELOCK) || type.eql?(SCHLAGELOCK)
        edge_state = lock["edge_state_id"]
        if edge_state.present?
          if lock_id.present?
            @community.edge_state.remote_locks.update_attributes() if type.eql?(REMOTELOCK)
            @community.edge_state.yales.update_attributes() if type.eql?(YALELOCK)
            @community.edge_state.schlages.update(email: lock["emails"], password: lock["password"]) if type.eql?(SCHLAGELOCK)
          else
            @community.edge_state.remote_locks.create() if type.eql?(REMOTELOCK)
            @community.edge_state.yales.create() if type.eql?(YALELOCK)
            @community.edge_state.schlages.create(email: lock["emails"], password: lock["password"]) if type.eql?(SCHLAGELOCK)
          end
        else
          edge_state_lock = @community.create_edge_state()
          edge_state_lock.remote_locks.create() if type.eql?(REMOTELOCK)
          edge_state_lock.yales.create() if type.eql?(YALELOCK)
          edge_state_lock.schlages.create(email: lock["emails"], password: lock["password"]) if type.eql?(SCHLAGELOCK)
        end
      end
      if type.eql?(DWELO)
        if lock_id.present?
          @community.dwelo.update(client_id: lock["client_id"], client_secret: lock["client_secret"])
        else
          @community.create_dwelo(client_id: lock["client_id"], client_secret: lock["client_secret"])
        end
      end
      if type.eql?(LATCH)
        if lock_id.present?
          @community.latch.update(client_id: lock["client_id"], client_secret: lock["client_secret"])
        else
          @community.create_latch(client_id: lock["client_id"], client_secret: lock["client_secret"])
        end
      end
      if type.eql?(IGLOOHOME)
        if lock_id.present?
          @community.igloohome.update_attributes(email: lock["email"])
        else
          @community.create_igloohome(email: lock["email"])
        end
      end
      if type.eql?(ZERV)
        if lock_id.present?
          @community.zerv.update(facility_id: lock["facility_id"], badge_id: lock["badge_id"], card_format: lock["card_format"])
        else
          @community.create_zerv(facility_id: lock["facility_id"], badge_id: lock["badge_id"], card_format: lock["card_format"])
        end
      end
    end
  rescue => ex
    render json: { status: false, message: ex.message }
  end
end

  private

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil },
           status: :not_found
  end
end
