namespace :stripe do
  desc 'create communities for demo of dataprocessing module'
  task :refund => :environment do
    refund = Stripe::Refund.create({
          amount: 50,
          payment_intent: "ch_1GkTRQHYrFZoTwBtLltSf0u8",
        })   
  end
end