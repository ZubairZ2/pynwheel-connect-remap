class CrmProvidersController < ApplicationController
  def update

    @crm_provider = CrmCredential.find(params[:id])

    if @crm_provider.update(crm_provider_params)
      redirect_to community_settings_path(current_community), :notice => "Crm Provider successfully updated."
    end
  end

  private
    def crm_provider_params
      params.require(:crm_credential).permit!
    end
end
