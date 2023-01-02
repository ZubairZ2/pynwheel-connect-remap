
namespace :lock_instructions do

  desc 'Set locks default instructions text'
  task :default_text => :environment do
    Zerv.update_all(lock_instruction_text: "When you are near the fob reader press unlock below to gain access.")
    Latch.update_all(lock_instruction_text: "Tap the center of the black Latch Lens on the device and enter your Doorcode.")
    Dwelo.update_all(lock_instruction_text: "")
    EdgeState.update_all(lock_instruction_text: "")
    Igloohome.update_all(lock_instruction_text: "Tap the black circle to wake lock up. Enter code then press the unlock button in the middle of the lock face.")
  end
end