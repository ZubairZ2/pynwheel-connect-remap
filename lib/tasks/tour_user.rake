namespace :tour_user do
  desc 'Remove special chearacters from tour users phone number'
  task :remove_special_characters_from_phone_number => :environment do

    TourUser.all.each do |tour_user|
      if tour_user.present? && tour_user.phone_number.present?
        phone_number = tour_user.phone_number

        unless phone_number[0] == "+"
          phone_number = "+1#{phone_number}"
        end
        
        tour_user.update(phone_number: phone_number&.tr('(), ,-', ''))
      end

    end
  end
end
