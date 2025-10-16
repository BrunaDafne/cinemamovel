// DashboardInstrumented.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { imageUrl, genreMap, filtrosGeneros } from '../constants/api';
import moviespreJson from '../data/moviespre.json';

// ==================== MÉTRICAS (in-memory) ====================
const renderStats = {
  dashboardRenders: 0,
  cardRenders: {} as Record<number, number>,
  navigationEvents: [] as { action: string; timestamp: number }[],
};

// Marcadores ASCII (sem emoji/acentos) para facilitar grep/sed
const logMetrics = () => {
  try {
    const data = JSON.stringify(renderStats, null, 2);
    console.log('---METRICS_JSON_START---');
    console.log(data);
    console.log('---METRICS_JSON_END---');
  } catch (e) {
    console.warn('Erro ao gerar metrics JSON:', e);
  }
};
// ===================================================

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export default function DashboardBaseline({ navigation }: Props) {
  const [movies, setMovies] = useState<any[]>(moviespreJson);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'Todos' | 'Ação' | 'Drama' | 'Ficção Científica' | 'Suspense'
  >('Todos');

  const hasUnmounted = useRef(false);

  // incrementa contador de renders da tela (executa em cada render)
  renderStats.dashboardRenders++;

  useEffect(() => {
    // só log opcional rápido para ver no console
    console.log('RENDER_DASHBOARD count=', renderStats.dashboardRenders);
  });

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

  const renderItem = ({ item }: any) => {
    // contabiliza renderizações de cada card individualmente
    renderStats.cardRenders[item.id] =
      (renderStats.cardRenders[item.id] || 0) + 1;

    const title = item.title || item.name;
    const genreName = item.genre_ids?.length
      ? genreMap[item.genre_ids[0]]
      : 'Outros';

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
        <Image
          source={{
            uri: item.poster_path
              ? `${imageUrl}${item.poster_path}`
              : 'https://via.placeholder.com/200x300',
          }}
          style={styles.poster}
        />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.genre}>{genreName}</Text>
        <Text style={styles.rating}>⭐ {item.vote_average.toFixed(1)}</Text>
      </TouchableOpacity>
    );
  };

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
      // LOG IMEDIATO ao perder foco (assim o script captura no logcat)
      logMetrics();
    });

    return () => {
      // garante log caso o componente seja desmontado de vez
      if (!hasUnmounted.current) {
        hasUnmounted.current = true;
        logMetrics();
      }
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🎬 Catálogo de Filmes (baseline)</Text>

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
