# frozen_string_literal: true

module Wayfinding
  # Server-side undo of a Detect Hallways run: the nodes and edge rows the run
  # created that are still pending are removed (an edge row between two stored
  # nodes that the run confirmed is removed as well, with its mirrored
  # adjacency); anything the user has since confirmed by moving or confirming
  # it stays, because they touched it. The run is marked undone.
  module DetectionUndo
    module_function

    def call(run, user: nil)
      return { removed_nodes: 0, removed_edges: 0, reason: 'already_undone' } if run.undone?

      removed_nodes = 0
      removed_edges = 0
      VersionBump.suspend do
        ApplicationRecord.transaction do
          level = run.parent
          run.hallway_edges.find_each do |edge|
            a = Hallway.find_by(id: edge.from_hallway_id)
            b = Hallway.find_by(id: edge.to_hallway_id)
            [[a, b], [b, a]].each do |from, to|
              next if from.nil? || to.nil? || !Array(from.next_points).include?(to.id)

              from.update!(next_points: Array(from.next_points) - [to.id])
            end
            edge.destroy!
            removed_edges += 1
          end
          run.hallways.pending.find_each do |hallway|
            Hallway.on_level(level).where('? = ANY(next_points)', hallway.id).find_each do |other|
              other.update!(next_points: Array(other.next_points) - [hallway.id])
            end
            hallway.destroy!
            removed_nodes += 1
          end
          run.update!(status: 'undone', undone_at: Time.current)
          level.class.where(id: level.id).update_all('wayfinding_version = wayfinding_version + 1')
          PaperTrail::Version.create!(item_type: level.class.base_class.name, item_id: level.id, event: 'wayfinding_detect_undo', whodunnit: user&.id&.to_s,
                                      community_id: run.community_id, object: { run_id: run.id, removed_nodes: removed_nodes, removed_edges: removed_edges }.to_json)
        end
      end
      { removed_nodes: removed_nodes, removed_edges: removed_edges }
    end
  end
end
