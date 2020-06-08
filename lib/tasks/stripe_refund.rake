namespace :stripe do
  desc 'create communities for demo of dataprocessing module'
  task :refund => :environment do
  	Stripe::Refund.create({
	  charge: 'ch_1GkTRQHYrFZoTwBtLltSf0u8',
	}) 
  end
end