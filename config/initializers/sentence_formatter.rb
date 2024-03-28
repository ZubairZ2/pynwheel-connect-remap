module SentenceFormatter
  def self.capitalized_words(community_name)
    prepositions = %w{a an the at by for in of on to with and but or nor}
    words = community_name.split
    
    capitalized_words = words.map.with_index do |word, index|
      index == 0 || !prepositions.include?(word.downcase) ? word.capitalize : word.downcase
    end
    
    capitalized_words.join(' ')

  rescue => ex
    community_name
  end
end