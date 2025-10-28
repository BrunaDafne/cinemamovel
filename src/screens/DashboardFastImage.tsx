// DashboardFastImage.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import FastImage, { OnLoadEvent } from 'react-native-fast-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { API_KEY, BASE_URL } from '@env';
import { imageUrl, genreMap, filtrosGeneros } from '../constants/api';
import moviespreJson from '../data/moviespre.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

// ----------------- MÉTRICAS (in-memory) -----------------
const renderStats = {
  dashboardRenders: 0,
  cardRenders: {} as Record<number, number>,
  imageLoads: [] as { id: number; durationMs: number }[],
  navigationEvents: [] as { action: string; timestamp: number }[],
};

const imageTimers: Record<number, number> = {};

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

export default function DashboardFastImage({ navigation }: Props) {
  const [movies, setMovies] = useState<any[]>(moviespreJson);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'
  >('Todos');

  renderStats.dashboardRenders++;

  // fetch functions same as baseline (omitted here for brevity)...
  async function fetchPopularMovies(pages = 1) {
    /* same as baseline */
  }
  async function searchMovies(query: string) {
    /* same as baseline */
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
    //fetchPopularMovies();
  }, []);

  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', () => {
      renderStats.navigationEvents.push({
        action: 'focus_dashboard',
        timestamp: Date.now(),
      });
    });
    const unsubBlur = navigation.addListener('blur', () => {
      renderStats.navigationEvents.push({
        action: 'leave_dashboard',
        timestamp: Date.now(),
      });
      logMetrics();
    });
    return () => {
      try {
        logMetrics();
      } catch {}
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);

  const renderItem = ({ item }: any) => {
    renderStats.cardRenders[item.id] =
      (renderStats.cardRenders[item.id] || 0) + 1;

    const title = item.title || item.name;
    const genreName = item.genre_ids?.length
      ? genreMap[item.genre_ids[0]]
      : 'Outros';
    const uri = item.poster_path
      ? `${imageUrl}${item.poster_path}`
      : 'https://via.placeholder.com/200x300';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          renderStats.navigationEvents.push({
            action: `navigate_to_${item.id}`,
            timestamp: Date.now(),
          });
          navigation.navigate('MovieDetails', { movieId: item.id });
        }}
      >
        <FastImage
          style={styles.poster}
          source={{ uri }}
          onLoadStart={() => {
            imageTimers[item.id] = Date.now();
          }}
          onLoadEnd={() => {
            const start = imageTimers[item.id] || Date.now();
            const duration = Date.now() - start;
            renderStats.imageLoads.push({ id: item.id, durationMs: duration });
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
            <Text
              style={filter === g ? styles.filterTextActive : styles.filterText}
            >
              {g}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#000"
          style={{ marginTop: 50 }}
        />
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

// styles same as baseline
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
