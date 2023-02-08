module Lograge
	module Formatters
		class JsonCustom
			def initialize
				@key_value_formatter = Lograge::Formatters::KeyValue.new
			end

			def call(date)
				param_filter = ActiveSupport::ParameterFilter.new(Rails.application.config.filter_parameters)
				filtered_data = param_filter.filter data
				message  = @key_value_formatter.call(allowed_data(data: data))
				message
				# TODO; We can add here any third party service to log data accordingly i.e, AWS, GCP, LINODE, DIGITALOCEAN
				# if defined? (Any Service)
				# 	data.merge(message: message)
				# else
				# 	message
				# end
			end

			def allowed_data(data:)
				return data unless Rails.env.production?

				data.except(:params, :format, :unpermitted_params, :user_id, :request_id)
			end

		end
	end
end