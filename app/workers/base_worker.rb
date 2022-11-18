class BaseWorker
  include Sidekiq::Worker
  sidekiq_options queue: 'base_worker', retry: 3

  def perform(complexity)
    case complexity

    when 'super_hard'
      puts "\n---------- super hard Job here! ---------------\n"
    when 'hard'
      sleep 10
      puts "\n---------- hard Job here! ---------------\n"
    else
      sleep 1
      puts "\n---------- easy job here! ---------------\n"
    end
  end
end