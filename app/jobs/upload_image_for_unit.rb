class UploadImageForUnit < ApplicationJob
  include SuckerPunch::Job

  def perform(community_id, ids, tmp_path)
    community = Community.find(community_id)
    units = community.units.where(id: ids)

    # Open once and reuse
    File.open(tmp_path) do |file|
      units.each do |unit|
        unit.image = file
        unit.save!
      end
    end

    # Cleanup
    File.delete(tmp_path) if File.exist?(tmp_path)
  end
end
