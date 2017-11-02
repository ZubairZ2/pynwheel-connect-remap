# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: 'Star Wars' }, { name: 'Lord of the Rings' }])
#   Character.create(name: 'Luke', movie: movies.first)

DefaultImage.create(name: "default-image-1", image: ActionController::Base.helpers.asset_url("shutterstock_92924629.jpg", type: :image))
DefaultImage.create(name: "default-image-2", image: ActionController::Base.helpers.asset_url("shutterstock_93080428.jpg", type: :image))
DefaultImage.create(name: "default-image-3", image: ActionController::Base.helpers.asset_url("shutterstock_105979382.jpg", type: :image))
DefaultImage.create(name: "default-image-4", image: ActionController::Base.helpers.asset_url("shutterstock_145340047.jpg", type: :image))
DefaultImage.create(name: "default-image-5", image: ActionController::Base.helpers.asset_url("shutterstock_159000224.jpg", type: :image))
DefaultImage.create(name: "default-image-6", image: ActionController::Base.helpers.asset_url("shutterstock_162743195.jpg", type: :image))
DefaultImage.create(name: "default-image-7", image: ActionController::Base.helpers.asset_url("shutterstock_167300102.jpg", type: :image))
DefaultImage.create(name: "default-image-8", image: ActionController::Base.helpers.asset_url("shutterstock_172085900.jpg", type: :image))
DefaultImage.create(name: "default-image-9", image: ActionController::Base.helpers.asset_url("shutterstock_184868945.jpg", type: :image))