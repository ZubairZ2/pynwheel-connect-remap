class Api::V2::SecureLocksController < Api::V2::ApiApplicationController
  before_action :doorkeeper_authorize!
  before_action :load_community, only: [:index]

  def index
    edge_state = @community.edge_state
    dwelo = @community.dwelo
    latch = @community.latch
    zerv = @community.zerv
    igloo_home = @community.igloohome
    @locks = []
    @locks << { type: EDGESTATE, details: edge_state } if edge_state.present?
    @locks << { type: DWELO, details: dwelo } if dwelo.present?
    @locks << { type: LATCH, details: latch } if latch.present?
    @locks << { type: ZERV, details: zerv } if zerv.present?
    @locks << { type: IGLOOHOME, details: igloo_home } if igloo_home.present?
    if @locks.any?
      render json: { success: true, data: render_secure_locks('Locks', @locks) }
    else
      render json: { success: false, message: 'No locks added yet!' }
    end
  end

#   def add_secure_locks
#     begin
#     lock_params = params['secure_locks']
#     lock_params.values.each do |lock|
#       type = lock['type']
#       lock_id = lock['id']
#       username = lock['username']
#       secret_code = lock['secret_code']
#       file = lock['csvfile']
#       if type.eql?(DWELO)
#         if lock_id.present?
#           @community.dwelo.update(client_id: params["username"], client_secret: params["secret_code"])
#         end
#       end
#       if type.eql?(EDGESTATE)
#         if lock_id.present?
#           binding.pry
#           @community.edge_state.update(client_id: params["username"], client_secret: params["secret_code"])
#         end
#       end
#       if type.eql?(LATCH)
#         if lock_id.present?
#           @community.latch.update(client_id: params["username"], client_secret: params["secret_code"])
#         end
#       end
#       if type.eql?(IGLOOHOME)
#         if lock_id.present?
#           @community.igloo_home.update(username: params["username"], password: params["secret_code"])
#         end
#       end
#     end
#   rescue => ex
#     render json: { status: false, message: ex.message }
#   end
# end

  private

  def render_secure_locks(type, secure_locks)
    { type => secure_locks.as_json }
  end

  def load_community
    @community = Community.find params[:community_id]
  rescue ActiveRecord::RecordNotFound
    render json: { success: false, error_code: 400, message: 'Community not found', data: nil },
           status: :not_found
  end
end
