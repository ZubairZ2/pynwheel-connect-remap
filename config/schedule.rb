
set :environment, ENV['CRON_ENVIRONMENT']

every 1.day, at: ['09:00 pm', '09:00 am'] do 
  rake "providers_data_updation:entrata"
end

every 1.day, at: ['00:00 am', '12.00 pm'] do
  rake "providers_data_updation:yardi"
end

every 1.day, at: ['03:00 am', '03:00 pm'] do
  rake "providers_data_updation:yardi_rent_cafe"
end

every 1.day, at: ['06:00 am', '06:00 pm'] do
  rake "providers_data_updation:real_page"
end