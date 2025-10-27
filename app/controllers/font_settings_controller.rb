class FontSettingsController < ApplicationController
  before_action :set_community

  def update_or_create
    @font_setting = @community.font_setting || @community.build_font_setting

    respond_to do |format|
      if @font_setting.update(font_setting_params)
        alert_message = "Font family updated successfully."

        format.html do
          redirect_to company_communities_path(current_company),
                      notice: alert_message
        end

        format.js do
          render js: "$('#flash-message').html('<div class=\"alert alert-success\">#{alert_message}</div>');
                      setTimeout(function() { $(\".alert\").fadeOut('slow'); }, 5000);"
        end
      else
        alert_message = @font_setting.errors.full_messages.join(', ')

        format.html do
          redirect_to company_communities_path(current_company),
                      alert: alert_message
        end

        format.js do
          render js: "$('#flash-message').html('<div class=\"alert alert-danger\">#{alert_message}</div>');
                      setTimeout(function() { $(\".alert\").fadeOut('slow'); }, 5000);"
        end
      end
    end
  end

  private

  def set_community
    @community = Community.find(params[:id])
  end

  def font_setting_params
    params.require(:font_setting).permit(:svg_labels_font_family)
  end
end
