module ToursHelper
	def is_version_supported params
		if params[:version].present?
			app_version = AppVersion.first
			PorticoRequest.create(app_name: params[:appName], user_id: params[:tour_user_id], os_type: params[:appPlatform], app_version: params[:version].to_i)
			app_version.update_attributes(portico_version: params[:version].to_i) if (params[:version].to_i > app_version.portico_version)
			if params[:version].to_i >= app_version.supported_version.to_i
        true
      else
        false
      end
		else
			true
		end
	end
	def redirect_url app_name, os_type
		if os_type == "android"
			(app_name == "Self Tour") ? "https://play.google.com/store/apps/details?id=com.pynwheel.selftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour"
		else
			(app_name == "Self Tour") ? "https://itunes.apple.com/us/app/self-tour/id1488907392" : "https://itunes.apple.com/us/app/lincoln-property-self-tour/id1508997129"
		end
	end
	def get_version_access params
		if is_version_supported params
      allow_usage = true
      redirect_url = ""
    else
      allow_usage = false
      redirect_url = redirect_url(params[:appName], params[:appPlatform])
    end
    return allow_usage, redirect_url 
	end
end
