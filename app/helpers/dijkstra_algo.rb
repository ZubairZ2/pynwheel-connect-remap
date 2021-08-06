module DijkstraAlgo
	#ruby 2.3.1 recomended
	class Graph
  	attr_reader :graph, :nodes, :previous, :distance, :complete_path, :source #getter methods
    INFINITY = 1 << 64
  
    def initialize
      @graph = {} # the graph // {node => { edge1 => weight, edge2 => weight}, node2 => ...
      @nodes = Array.new
      @complete_path = Array.new
    end
  
  # connect each node with target and weight
    def connect_graph(source, target, weight)
      if (!graph.has_key?(source))
        graph[source] = {target => weight}
      else
        graph[source][target] = weight
      end
      if (!nodes.include?(source))
        nodes << source
      end
    end
  
  # connect each node bidirectional
    def add_edge(source, target, weight)
      connect_graph(source, target, weight) #directional graph
      #connect_graph(target, source, weight) #non directed graph (inserts the other edge too)
    end
  
  
  # based of wikipedia's pseudocode: http://en.wikipedia.org/wiki/Dijkstra's_algorithm
  
  
    def dijkstra(source)
      @distance={}
      @previous={}
      nodes.each do |node|#initialization
        @distance[node] = INFINITY #Unknown distance from source to vertex
        @previous[node] = -1 #Previous node in optimal path from source
      end
  
      @distance[source] = 0 #Distance from source to source
  
      unvisited_node = nodes.compact #All nodes initially in Q (unvisited nodes)
  
      while (unvisited_node.size > 0)
        u = nil;
  
        unvisited_node.each do |min|
          if (not u) or (@distance[min] and @distance[min] < @distance[u])
            u = min
          end
        end
  
        if (@distance[u] == INFINITY)
          break
        end
  
        unvisited_node = unvisited_node - [u]
  
        graph[u].keys.each do |vertex|
          alt = @distance[u] + graph[u][vertex]
  
          if (alt < @distance[vertex])
            @distance[vertex] = alt
            @previous[vertex] = u  #A shorter path to v has been found
          end
  
        end
  
      end
  
    end
  
  
  # To find the full shortest route to a node
  
    def find_path(dest)
      if @previous[dest] != -1
        find_path @previous[dest]
      end
      @path << dest
    end
    
    def return_minimum_distance_node(destination_arr)
      new_check_hash = {}
      destination_arr.each do |ele|
        if @distance.has_key?(ele)
          new_check_hash[ele] = @distance[ele]
        end
      end
      minimum_node_key = new_check_hash.keys.first
      minimum_node_value = new_check_hash.values.first
      new_check_hash.each do |key,value|
        if new_check_hash[key] < minimum_node_value
          minimum_node_key = key
          minimum_node_value = value
        end
      end
      return minimum_node_key
    end
  
  # Gets all shortests paths using dijkstra
  
    def shortest_paths_without_sorting(source, destination_arr)
      @complete_path = []
      @source = source
      destination_arr.length.times do |dest|
        @graph_paths=[]
        dijkstra @source
        @path=[]
        min_distance_node = return_minimum_distance_node(destination_arr)
        destination_arr = destination_arr - [min_distance_node]
        find_path min_distance_node # traverse back to every node from selected node
        actual_distance=if @distance[min_distance_node] != INFINITY
                        @distance[min_distance_node]
                        else
                        "no path"
                        end
        @graph_paths<< "Target(#{min_distance_node})  #{@path.join("-->")} : #{actual_distance}"

        #print_result
        @complete_path << @path
        @source = min_distance_node
      end
      @graph_paths
    end

    def shortest_paths_with_sorting(source, destination_arr)
        @complete_path = []
        @source = source
        destination_arr.each do |dest|
          @graph_paths=[]
          dijkstra @source
          @path=[]
          find_path dest # traverse back to every node from selected node
          actual_distance=if @distance[dest] != INFINITY
                          @distance[dest]
                          else
                          "no path"
                          end
          @graph_paths<< "Target(#{dest})  #{@path.join("-->")} : #{actual_distance}"
          #print_result
          @complete_path << @path
          @source = dest
        end
        @graph_paths
    end

    def shortest_paths_with_sorting_in_floor(source, destination_arr, elevator_arr)
      @complete_path = []
      @source = source
      destination_arr.each do |dest|
        @graph_paths=[]
        dijkstra @source
        @path=[]
        find_path dest # traverse back to every node from selected node
        actual_distance=if @distance[dest] != INFINITY
                        @distance[dest]
                        else
                        "no path"
                        end
        @graph_paths<< "Target(#{dest})  #{@path.join("-->")} : #{actual_distance}"
        @complete_path << @path
        @source = dest
      end
      @graph_paths
      @graph_paths = []
      dijkstra @source
      @path=[]
      min_distance_node = return_minimum_distance_node(elevator_arr)
      find_path min_distance_node # traverse back to every node from selected node
      @complete_path << @path
      @source = min_distance_node
    end
  
    # print result
  
    def print_result
      @graph_paths.each do |graph|
        puts graph
      end
    end
  
  end
  
end