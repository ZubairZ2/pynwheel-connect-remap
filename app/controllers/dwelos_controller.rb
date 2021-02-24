class DwelosController < ApplicationController
  before_action :set_community
  include DweloDevicesHelper
  def index
    if @community.dwelo.present?
      community_remote_locks = @community.dwelo.remote_locks
      render json: community_remote_locks
    end

  end

  def new
    @dwelo = Dwelo.new
  end

  def create
    unless @community.dwelo.present?
      @dwelo = Dwelo.create!(client_id: params[:dwelo][:client_id], client_secret: params[:dwelo][:client_secret], default_community_id: params[:dwelo][:default_community_id], community_id: @community.id)
      @community.update_columns(locks_provider: "Dwelo")
      redirect_to new_community_dwelo_path(@community), notice: 'Dwelo Account Created Successfully'
    else
      if @dwelo.present?
        @community.update_columns(locks_provider: "Dwelo")
        flash[:notice] = "Dwelo Account Updated Successfully."
      end
    end

  end

  def edit
    @dwelo_user = Dwelo.find params[:id]
  end

  def update
    @dwelo_user_account = Dwelo.find params[:id]
    @community.update_columns(locks_provider: "Dwelo")
    if @dwelo_user_account.update!(dwelo_params)
      respond_to do |format|
        format.html { redirect_to new_community_dwelo_path, notice: 'Dwelo account successfully updated.' }
      end
    end
  end

  def test_dwelo_connection
    @community = Community.find params[:community_id]
    if @community.enable_locks and @community.locks_provider == "Dwelo" and @community.dwelo.present?
      dwelo_client_credentials(@community.dwelo)
      if @token.present?
        token_type = "Bearer"
        auth_header = token_type + " " + @token

        url = base_url + "/v4/integrations/pynwheel/devices/?community_id=" + @community.dwelo.default_community_id + "&per_page=1000"
        xml = HTTParty.get(url,
                            :headers => {'Authorization' => auth_header,
                                        'Accept' => 'application/vnd.lockstate+json; version=1'})

        render :xml => xml
      else
        flash[:error] = "Data cannot be imported. Please check the credentails or contact your data provider to troubleshoot."
        redirect_to new_community_dwelo_path(@community)
      end
    else
      flash[:error] = "Please enter the Dwelo credentials before testing data."
      redirect_to new_community_dwelo_path(@community)
    end
  end

  def map_dwelo_locks
    community = Community.find(params[:community_id])
    access_token = dwelo_client_credentials(community.dwelo)
    if access_token.present? and community.dwelo.remote_locks.present?
      if community.present?
        if community.is_sitemap
          community_units = community.units
          community_locks = community.dwelo.remote_locks
          community_units.each do |community_unit|
            if community_unit.building.present?
              name = community_unit.building + "-" + community_unit.marketing_name
              unit_name = name.gsub('-', '').gsub(' ', '')
              community_locks.each do |community_lock|
                community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                if (unit_name == community_lock_name)
                  community_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
                end
              end
            else
              unit_name = community_unit.marketing_name.gsub('-', '').gsub(' ', '')
              community_locks.each do |community_lock|
                community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                if (unit_name == community_lock_name)
                  community_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
                end
              end
              # same_name_lock = community_locks.find_by(name: community_unit.marketing_name) rescue nil
            end
            # if same_name_lock.present?
            #   same_name_lock.update_attributes(stop_id: community_unit.id, stop_type: "unit", stop_name: community_unit.marketing_name)
            # end

          end
        else
          community_locks = community.dwelo.remote_locks
          community_floorplates = community.floorplates rescue nil
          if community_floorplates.present?
            community_floorplates.each do |community_floorplate|
              community_floorplate_units = community_floorplate.units rescue nil
              community_floorplate_units.each do |floorplate_unit|
                if floorplate_unit.building.present?
                  name = floorplate_unit.building + "-" + floorplate_unit.marketing_name
                  unit_name = name.gsub('-', '').gsub(' ', '')
                  # same_name_lock = community_locks.find_by(name: name) rescue nil

                  community_locks.each do |community_lock|
                    community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                    if (unit_name == community_lock_name)
                      community_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                    end
                  end
                else
                  unit_name = floorplate_unit.marketing_name.gsub('-', '').gsub(' ', '')
                  community_locks.each do |community_lock|
                    community_lock_name = community_lock.name.gsub('-', '').gsub(' ', '')
                    if (unit_name == community_lock_name)
                      community_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                    end
                  end
                  # same_name_lock = community_locks.find_by(name: floorplate_unit.marketing_name) rescue nil
                end
                # if same_name_lock.present?
                #   same_name_lock.update_attributes(stop_id: floorplate_unit.id, stop_type: "unit", stop_name: floorplate_unit.marketing_name)
                # end

              end

            end

          end

        end
      end
      flash[:notice] = "Locks maped successfully."
      render :js => "window.location = '/communities/#{community.id}/dwelos/new'"
    else
      flash[:error] = "Something went wrong, please check your credentials."
        render :js => "window.location = '/communities/#{community.id}/dwelos/new'"
    end
  end

  def remove_dwelo_locks
    if current_community.dwelo.present?
      if current_community.dwelo.remote_locks.present?
        current_community.dwelo.remote_locks.destroy_all
        flash[:notice] = "Locks deleted successfully"
        redirect_to new_community_dwelo_path(current_community)
      else
        flash[:error] = "No locks are present"
        redirect_to new_community_dwelo_path(current_community)
      end
    else
      flash[:error] = "Credentials for Dwelo are missing"
      redirect_to new_community_dwelo_path(current_community)
    end
  end

  private
  def set_community
    @community = Community.find(params[:community_id])
  end

  def set_dwelo_user
    @dwelo_user = Dwelo.find params[:community_id]
  end

  def dwelo_params
    params.require(:dwelo).permit(:client_id, :client_secret, :default_community_id)
  end
end