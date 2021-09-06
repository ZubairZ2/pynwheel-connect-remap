class Hallway < ApplicationRecord
  belongs_to :parent, polymorphic: true

  def delete_hallway_point(hallways)
    linked_hallways = hallways.where(id: self.next_points)
    linked_by_hallways = hallways.where("#{self.id} = ANY(next_points)") # previous hallways
    if linked_hallways.count == 0 && linked_by_hallways.count == 0 # for solo hallway point like me
      self.destroy
      hallway = hallways.last; hallway.selected = true; hallway.save
    elsif linked_by_hallways.count == 0 && linked_hallways.count > 0 # for first point (point which have no parent)
      linked_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_hallways.first; hallway.selected = true; hallway.save
    elsif linked_hallways.count == 0  # For leaf point
      linked_by_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_by_hallways.last; hallway.selected = true; hallway.save
    elsif linked_hallways.count <= 1 && linked_by_hallways.count <= 2 || linked_hallways.count <= 2 && linked_by_hallways.count <= 1 # For middle point and possible to delete
      if linked_hallways.count == 1 && linked_by_hallways.count == 1
        prev_point = linked_by_hallways.first
        next_point = linked_hallways.first
        prev_point.next_points = (prev_point.next_points - [self.id]).uniq
        prev_point.next_points = (prev_point.next_points + [next_point.id]).uniq
        prev_point.save
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      elsif linked_hallways.count == 1 && linked_by_hallways.count == 2 # previous are two and next is only one  from middle a,b => middle => c
        linked_by_hallways.each do |hallway|
          hallway.next_points = (hallway.next_points - [self.id]).uniq
          hallway.next_points = (hallway.next_points + [linked_hallways.first.id]).uniq
          hallway.save
        end
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      elsif linked_hallways.count == 2 && linked_by_hallways.count == 1 # next are two and previous is only one  from middle c => middle => a,b
        hallway = linked_by_hallways.first
        hallway.next_points = (hallway.next_points - [self.id]).uniq
        hallway.next_points = (hallway.next_points + linked_hallways.pluck(:id)).uniq
        hallway.save
        self.destroy
        hallway = linked_hallways.last; hallway.selected = true; hallway.save
      end
    else
      linked_by_hallways.each {|hallway| hallway.next_points = (hallway.next_points - [self.id]).uniq; hallway.save }
      self.destroy
      hallway = linked_by_hallways.last; hallway.selected = true; hallway.save
    end
  end
end
