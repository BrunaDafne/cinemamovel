// DashboardFastImage.tsx (otimizado para testes com FastImage)
import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { API_KEY, BASE_URL } from '@env';
import { genreMap, filtrosGeneros } from '../constants/api';
import moviespreJson from '../data/moviespre.json';
import moviesJson from '../data/movies.json';
import moviesproJson from '../data/moviespro.json';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

// ----------------- MÉTRICAS (in-memory) -----------------
const renderStats = {
  dashboardRenders: 0,
  cardRenders: {} as Record<number, number>,
  imageLoads: [] as { id: number; durationMs: number }[],
  navigationEvents: [] as { action: string; timestamp: number }[],
};

const imageTimers: Record<number, number> = {};

// IMPORTANT: markers must match the script's awk exactly
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

/**
 * Helper: constrói URL redimensionada do TMDB.
 * Usamos w300 (tamanho adequado para o card) para reduzir download/decoding.
 */
const tmdbSized = (posterPath?: string | null, size = 'w300') => {
  if (!posterPath) return null;
  return `https://image.tmdb.org/t/p/${size}${posterPath}`;
};

export default function DashboardFastImageDois({ navigation }: Props) {
  const [movies, setMovies] = useState<any[]>(moviesproJson);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'
  >('Todos');

  // incrementa contador de renders da tela (mantido para métricas)
  useEffect(() => {
    renderStats.dashboardRenders++;
  });

  // ---------- Fetchers (mesma assinatura do baseline) ----------
  async function fetchPopularMovies(pages = 1) {
    try {
      setLoading(true);
      const allResults: any[] = [];
      for (let page = 1; page <= pages; page++) {
        const response = await fetch(
          `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=pt-BR&page=${page}`,
        );
        const data = await response.json();
        allResults.push(...data.results);
      }
      setMovies(allResults);
    } catch (error) {
      console.warn('Erro ao buscar filmes populares:', error);
    } finally {
      setLoading(false);
    }
  }

  async function searchMovies(query: string) {
    if (!query) {
      setMovies(moviespreJson);
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        `${BASE_URL}/search/movie?api_key=${API_KEY}&language=pt-BR&query=${query}`,
      );
      const data = await response.json();
      setMovies(data.results || []);
    } catch (error) {
      console.warn('Erro ao buscar filmes:', error);
    } finally {
      setLoading(false);
    }
  }
  // ------------------------------------------------------------

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

  // Listener de navegação + dump de métricas (mantido)
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

  // Auto-log: garante que haverá um bloco no logcat caso o script apenas deslize
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[auto-dump]');
      logMetrics();
    }, 8000); // 8s é suficiente para preload + swipes (ajuste se necessário)
    return () => clearTimeout(timer);
  }, [movies]);

  // Preload das primeiras N imagens para "warm cache" (FastImage)
  useEffect(() => {
    // só preload se tivermos filmes
    if (!movies || movies.length === 0) return;

    // escolher quantas pré-carregar (visíveis no window initial)
    const PRELOAD_COUNT = 20; // ajustável
    const toPreload = movies
      .slice(0, PRELOAD_COUNT)
      .map(m => tmdbSized(m.poster_path))
      .filter(Boolean)
      .map(uri => ({ uri }));

    if (toPreload.length > 0) {
      try {
        FastImage.preload(toPreload);
      } catch (e) {
        // não falhar o app por causa do preload
        console.warn('FastImage.preload falhou:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movies]);

  const renderItem = ({ item }: any) => {
    renderStats.cardRenders[item.id] =
      (renderStats.cardRenders[item.id] || 0) + 1;

    const title = item.title || item.name;
    const genreName = item.genre_ids?.length
      ? genreMap[item.genre_ids[0]]
      : 'Outros';
    const sizedUri = tmdbSized(item.poster_path, 'w300') || 'https://via.placeholder.com/200x300';

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
          resizeMode={FastImage.resizeMode.cover}
          style={styles.poster}
          source={{
            uri: sizedUri,
            // prioridade e cache: ajudam a priorizar visualmente e a cachear
            priority: FastImage.priority.normal,
            cache: FastImage.cacheControl.immutable,
          }}
          onLoadStart={() => {
            try {
              imageTimers[item.id] = Date.now();
            } catch {}
          }}
          onLoadEnd={() => {
            try {
              const start = imageTimers[item.id] || Date.now();
              const duration = Date.now() - start;
              renderStats.imageLoads.push({ id: item.id, durationMs: duration });
            } catch {}
          }}
          onError={e => {
            // opcional: log para entender erros de fetch/decodificação
            // não atrapalha o fluxo de métricas
            // console.warn('FastImage error', e.nativeEvent);
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
      <Text style={styles.header}>🎬 Catálogo de Filmes F2</Text>
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
          removeClippedSubviews
        />
      )}
    </View>
  );
}

// ----------------- Estilos (mantidos iguais) -----------------
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
