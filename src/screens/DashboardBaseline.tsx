// DashboardBaseline.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { API_KEY, BASE_URL } from '@env';
import { imageUrl, genreMap, filtrosGeneros } from '../constants/api';
import moviespreJson from '../data/moviespre.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

// ----------------- MÉTRICAS (in-memory) -----------------
const renderStats = {
  dashboardRenders: 0,
  cardRenders: {} as Record<number, number>,   // id -> renders
  imageLoads: [] as { id: number; durationMs: number }[], // per image load
  navigationEvents: [] as { action: string; timestamp: number }[],
};

const imageTimers: Record<number, number> = {}; // temporário: id -> start ms

const logMetrics = () => {
  try {
    const data = JSON.stringify(renderStats, null, 2);
    console.log('---IMG_METRICS_START---');
    console.log(data);
    console.log('---IMG_METRICS_END---');
  } catch (e) {
    console.warn('Erro gerando metrics JSON:', e);
  }
};
// -------------------------------------------------------

export default function DashboardBaseline({ navigation }: Props) {
  const [movies, setMovies] = useState<any[]>(moviespreJson);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'
  >('Todos');

  // incrementa contador de renders da tela
  renderStats.dashboardRenders++;

  async function fetchPopularMovies(pages = 1) {
    try {
      setLoading(true);
      let allMovies: any[] = [];

      for (let page = 1; page <= pages; page++) {
        const response = await fetch(
          `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${page}`,
        );
        const data = await response.json();
        allMovies = [...allMovies, ...data.results];
      }
      setMovies(allMovies || []);
    } catch (err) {
      console.error('Erro ao carregar filmes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function searchMovies(query: string) {
    try {
      if (!query) return fetchPopularMovies();
      setLoading(true);
      const res = await fetch(
        `${BASE_URL}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${query}`,
      );
      const data = await res.json();
      setMovies(data.results || []);
    } catch (err) {
      console.error('Erro ao pesquisar filmes:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredMovies = useMemo(() => {
    return movies?.filter(m => {
      const title = m.title || m.name || '';
      const matchSearch = title.toLowerCase().includes(search.toLowerCase());
      const genreName = m.genre_ids?.length
        ? genreMap[m.genre_ids[0]]
        : 'Outros';
      const matchFilter = filter === 'Todos' || genreName === filter;
      return matchSearch && matchFilter;
    });
  }, [search, filter, movies]);

  useEffect(() => {
    //fetchPopularMovies(); // desativado por padrão
  }, []);

  // Log metrics quando sair da tela (assim o script captura)
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      renderStats.navigationEvents.push({ action: 'focus_dashboard', timestamp: Date.now() });
    });
    const unsubBlur = navigation.addListener('blur', () => {
      renderStats.navigationEvents.push({ action: 'leave_dashboard', timestamp: Date.now() });
      logMetrics();
    });
    return () => {
      try { logMetrics(); } catch {}
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  const renderItem = ({ item }: any) => {
    // contabiliza renderizações de cada card individualmente
    renderStats.cardRenders[item.id] = (renderStats.cardRenders[item.id] || 0) + 1;

    const title = item.title || item.name;
    const genreName = item.genre_ids?.length ? genreMap[item.genre_ids[0]] : 'Outros';
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          renderStats.navigationEvents.push({ action: `navigate_to_${item.id}`, timestamp: Date.now() });
          navigation.navigate('MovieDetails', { movieId: item.id });
        }}
      >
        <Image
          source={{
            uri: item.poster_path ? `${imageUrl}${item.poster_path}` : 'https://via.placeholder.com/200x300',
          }}
          style={styles.poster}
          onLoadStart={() => {
            try { imageTimers[item.id] = Date.now(); } catch {}
          }}
          onLoadEnd={() => {
            try {
              const start = imageTimers[item.id] || Date.now();
              const duration = Date.now() - start;
              renderStats.imageLoads.push({ id: item.id, durationMs: duration });
            } catch {}
          }}
        />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.genre}>{genreName}</Text>
        <Text style={styles.rating}>⭐ {item.vote_average?.toFixed(1)}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎬 Catálogo de Filmes</Text>
      <TextInput
        placeholder="Pesquisar filmes..."
        style={styles.search}
        value={search}
        onChangeText={text => {
          setSearch(text);
          searchMovies(text);
        }}
      />
      <View style={styles.filters}>
        {filtrosGeneros.map(g => (
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

      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredMovies}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 20 }}
          initialNumToRender={10}
          windowSize={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      )}
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
  filterBtnActive: { backgroundColor: '#333', borderColor: '#333' },
  filterText: { color: '#333' },
  filterTextActive: { color: '#fff' },
  card: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    margin: 6,
    padding: 8,
  },
  poster: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 8,
  },
  title: { fontSize: 14, fontWeight: 'bold' },
  genre: { fontSize: 12, color: '#555' },
  rating: { fontSize: 12, marginTop: 4 },
});
