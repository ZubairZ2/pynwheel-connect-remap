class DwelosController < ApplicationController
  before_action :set_community

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
      @dwelo = Dwelo.create!(client_id: params[:dwelo][:client_id], client_secret: params[:dwelo][:client_secret], default_community_id: params[:dwelo][:default_community_id], community_id: @community.id, grant_type: "client_credentials")
      if @dwelo.present?
        @community.update!(locks_provider: params[:default_community_id])
        flash[:notice] = "Dwelo Account Created Successfully."
        render :new
      end

    end
  end

  def edit
    @dwelo_user = Dwelo.find params[:id]
  end

  def update
    @dwelo_user_account = Dwelo.find params[:id]
    if @dwelo_user_account.update!(dwelo_params)
      # flash[:notice] = "Dwelo Account Updated Successfully."
      respond_to do |format|
        format.html { redirect_to new_community_dwelo_path, notice: 'User was successfully updated.' }
      end
    end
  end
  def map_dwelo_locks
    community = Community.find(params[:community_id])
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
