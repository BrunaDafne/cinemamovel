// DashboardWithHooks.tsx
import React, {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  GestureResponderEvent,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { imageUrl, genreMap, filtrosGeneros } from '../constants/api';
import moviespreJson from '../data/moviespre.json';
import moviesJson from '../data/movies.json';
import moviesProJson from '../data/moviespro.json'

// ==================== MÉTRICAS (mesmo formato) ====================
const renderStats = {
  dashboardRenders: 0,
  cardRenders: {} as Record<number, number>,
  navigationEvents: [] as { action: string; timestamp: number }[],
};

// Exibe métricas finais no console (sem salvar em arquivo)
const logMetrics = () => {
  const data = JSON.stringify(renderStats, null, 2);
  console.log('---METRICS_JSON_START---');
  console.log(data);
  console.log('---METRICS_JSON_END---');
};
// ===================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

type CardProps = {
  id: number;
  title: string;
  posterPath?: string | null;
  genreName: string;
  rating: number;
  onPress: (e?: GestureResponderEvent) => void;
};

const MovieCard = React.memo(
  function MovieCard({
    id,
    title,
    posterPath,
    genreName,
    rating,
    onPress,
  }: CardProps) {
    // contabiliza render de cada card individualmente
    renderStats.cardRenders[id] = (renderStats.cardRenders[id] || 0) + 1;

    return (
      <TouchableOpacity style={styles.card} onPress={onPress}>
        <Image
          source={{
            uri: posterPath
              ? `${imageUrl}${posterPath}`
              : 'https://via.placeholder.com/200x300',
          }}
          style={styles.poster}
        />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.genre}>{genreName}</Text>
        <Text style={styles.rating}>⭐ {rating.toFixed(1)}</Text>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    // shallow compare props primitive — evita render se props iguais
    return (
      prev.id === next.id &&
      prev.title === next.title &&
      prev.posterPath === next.posterPath &&
      prev.genreName === next.genreName &&
      prev.rating === next.rating &&
      prev.onPress === next.onPress
    );
  },
);

export default function DashboardWithHooks({ navigation }: Props) {
  const [movies] = useState<any[]>(moviesProJson);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'
  >('Todos');

  const hasUnmounted = useRef(false);

  // contador de render da tela
  renderStats.dashboardRenders++;
  useEffect(() => {
    console.log('📊 RENDER_DASHBOARD_hooks', renderStats.dashboardRenders);
  });

  // filteredMovies memoizado (já existia)
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

  // renderItem memoizado (gera props primitivas e um onPress estável por id)
  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      const id = Number(item.id);
      const title = item.title || item.name || '';
      const genreName = item.genre_ids?.length
        ? genreMap[item.genre_ids[0]]
        : 'Outros';
      const rating = Number(item.vote_average || 0);
      const posterPath = item.poster_path || null;

      // onPress definido dentro do callback: stable for this item because id is constant
      const onPress = () => {
        renderStats.navigationEvents.push({
          action: `navigate_to_${id}`,
          timestamp: Date.now(),
        });
        navigation.navigate('MovieDetails', { movieId: id });
      };

      return (
        <MovieCard
          id={id}
          title={title}
          posterPath={posterPath}
          genreName={genreName}
          rating={rating}
          onPress={onPress}
        />
      );
    },
    [navigation],
  );

  // listeners para foco/blur e log das métricas quando dashboard perde o foco
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      renderStats.navigationEvents.push({
        action: 'focus_dashboard',
        timestamp: Date.now(),
      });
    });
    const unsubscribeBlur = navigation.addListener('blur', () => {
      renderStats.navigationEvents.push({
        action: 'leave_dashboard',
        timestamp: Date.now(),
      });
      try {
        logMetrics();
      } catch (e) {
        console.warn('Erro logMetrics', e);
      }
    });

    return () => {
      try {
        logMetrics();
      } catch (e) {
        console.warn('Erro logMetrics cleanup', e);
      }
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎬 Catálogo de Filmes (with hooks)</Text>

      <TextInput
        placeholder="Pesquisar filmes..."
        style={styles.search}
        value={search}
        onChangeText={setSearch}
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
  poster: { width: '100%', height: 200, borderRadius: 10, marginBottom: 8 },
  title: { fontSize: 14, fontWeight: 'bold' },
  genre: { fontSize: 12, color: '#555' },
  rating: { fontSize: 12, marginTop: 4 },
});
