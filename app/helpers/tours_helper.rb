module ToursHelper
	def is_version_supported params
		if params[:version].present?
			app_version = AppVersion.first
			PorticoRequest.create(app_name: params[:appName], user_id: params[:tour_user_id], os_type: params[:appPlatform], app_version: params[:version])
			app_version.update_attributes(portico_version: params[:version]) if (params[:version] > app_version.portico_version)
			if params[:version] < ENV["MINIMUM_SUPPORTED_VERSION"].to_i
				false
			else
				true
			end
		else
			true
		end
	end
	def redirect_url app_name, os_type
		if os_type == "android"
			(app_name == "Self Tour") ? "https://play.google.com/store/apps/details?id=com.pynwheel.selftour" : "https://play.google.com/store/apps/details?id=com.pynwheel.lincolnselftour"
		else
			(app_name == "Self Tour") ? "https://apps.apple.com/us/app/self-tour/id1488907392" : "https://apps.apple.com/us/app/lincoln-property-self-tour/id1508997129"
		end
	end
end
