import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

const movies = [
  {
    id: '1',
    title: 'Interestelar',
    genre: 'Ficção Científica',
    rating: 8.6,
    poster: 'https://image.tmdb.org/t/p/w500/nCbkOyOMTeP9sE1VOE6bDuw7Pbj.jpg',
  },
  {
    id: '2',
    title: 'Oppenheimer',
    genre: 'Drama',
    rating: 8.3,
    poster: 'https://image.tmdb.org/t/p/w500/bvYjhsbxOBwpm8xLE5BhdA3a8CZ.jpg',
  },
  {
    id: '3',
    title: 'Batman: O Cavaleiro das Trevas',
    genre: 'Ação',
    rating: 9.0,
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  },
  {
    id: '4',
    title: 'A Origem',
    genre: 'Suspense',
    rating: 8.8,
    poster: 'https://image.tmdb.org/t/p/w500/aej3LRUga5rhgkmRP6XMFw3ejbl.jpg',
  },
  // depois podemos gerar +50 mockados ou puxar da API
];

export default function DashboardScreen({ navigation }: Props) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'>('Todos');

  const filteredMovies = useMemo(() => {
    return movies.filter((m) => {
      const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'Todos' || m.genre === filter;
      return matchSearch && matchFilter;
    });
  }, [search, filter]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎬 Catálogo de Filmes</Text>

      {/* Barra de pesquisa */}
      <TextInput
        placeholder="Pesquisar filmes..."
        style={styles.search}
        value={search}
        onChangeText={setSearch}
      />

      {/* Filtros */}
      <View style={styles.filters}>
        {['Todos', 'Ação', 'Drama', 'Ficção Científica', 'Suspense'].map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.filterBtn, filter === g && styles.filterBtnActive]}
            onPress={() => setFilter(g as any)}
          >
            <Text style={filter === g ? styles.filterTextActive : styles.filterText}>
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lista */}
      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            // navigation.navigate('MovieDetails', { movieId: item.id })
            onPress={() => console.log('teste')}
          >
            <Image source={{ uri: item.poster }} style={styles.poster} />
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.genre}>{item.genre}</Text>
            <Text style={styles.rating}>⭐ {item.rating}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 10 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  search: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  filters: { flexDirection: 'row', marginBottom: 10, flexWrap: 'wrap' },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 6,
  },
  filterBtnActive: {
    backgroundColor: '#333',
    borderColor: '#333',
  },
  filterText: { color: '#333' },
  filterTextActive: { color: '#fff' },
  card: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    marginBottom: 12,
    padding: 8,
  },
  poster: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold' },
  genre: { fontSize: 12, color: '#555' },
  rating: { fontSize: 12, marginTop: 4 },
});
