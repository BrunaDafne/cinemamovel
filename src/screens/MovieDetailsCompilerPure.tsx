// MovieDetailsCompilerSplit.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { API_KEY } from '@env';
import { RootStackParamList } from 'src/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

// ----------------- MÉTRICAS -----------------
const renderStats = {
  screenRenders: 0,
  componentRenders: {} as Record<string, number>,
  interactionEvents: [] as { action: string; timestamp: number }[],
};

const logMetrics = () => {
  try {
    const data = JSON.stringify(renderStats, null, 2);
    console.log('---METRICS_JSON_START---');
    console.log(data);
    console.log('---METRICS_JSON_END---');
  } catch (e) {
    console.warn('Erro gerando metrics JSON:', e);
  }
};

const countRender = (name: string) => {
  renderStats.componentRenders[name] =
    (renderStats.componentRenders[name] || 0) + 1;
};
// -------------------------------------------------------

export default function MovieDetailsCompiler({ route, navigation }: Props) {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorite, setFavorite] = useState(false);
  const [rating, setRating] = useState(0);
  const [overviewExpanded, setOverviewExpanded] = useState(false);

  const didLogRef = useRef(false);
  renderStats.screenRenders++;

  useEffect(() => {
    async function fetchMovieDetails() {
      try {
        setLoading(true);
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=pt-BR`,
        );
        const data = await res.json();
        setMovie(data);
      } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchMovieDetails();
  }, [movieId]);

  useEffect(() => {
    const unsubBlur = navigation.addListener('blur', () => {
      if (!didLogRef.current) {
        didLogRef.current = true;
        renderStats.interactionEvents.push({
          action: 'screen_blur_logged',
          timestamp: Date.now(),
        });
        logMetrics();
      }
    });
    return () => {
      if (!didLogRef.current) {
        didLogRef.current = true;
        renderStats.interactionEvents.push({
          action: 'component_unmounted_logged',
          timestamp: Date.now(),
        });
        logMetrics();
      }
      unsubBlur();
    };
  }, [navigation]);

  if (loading) {
    countRender('Loader');
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!movie) {
    countRender('NoMovie');
    return (
      <View style={styles.container}>
        <Text>Não foi possível carregar os detalhes do filme.</Text>
      </View>
    );
  }

  const toggleFavorite = () => {
    setFavorite(prev => !prev);
    renderStats.interactionEvents.push({
      action: 'toggle_favorite',
      timestamp: Date.now(),
    });
  };

  const setStar = (n: number) => {
    setRating(n);
    renderStats.interactionEvents.push({
      action: `set_rating_${n}`,
      timestamp: Date.now(),
    });
  };

  const toggleOverview = () => {
    setOverviewExpanded(prev => !prev);
    renderStats.interactionEvents.push({
      action: 'toggle_overview',
      timestamp: Date.now(),
    });
  };

  return (
    <MovieDetailsPure
      movie={movie}
      favorite={favorite}
      rating={rating}
      overviewExpanded={overviewExpanded}
      onToggleFavorite={toggleFavorite}
      onSetStar={setStar}
      onToggleOverview={toggleOverview}
    />
  );
}

// -------------------------------------------------------
// 🔹 Componente "puro" principal (otimizável ⭐)
// -------------------------------------------------------
function MovieDetailsPure({
  movie,
  favorite,
  rating,
  overviewExpanded,
  onToggleFavorite,
  onSetStar,
  onToggleOverview,
}: {
  movie: any;
  favorite: boolean;
  rating: number;
  overviewExpanded: boolean;
  onToggleFavorite: () => void;
  onSetStar: (n: number) => void;
  onToggleOverview: () => void;
}) {
  countRender('MovieDetailsPure');

  return (
    <ScrollView style={styles.container}>
      <Poster uri={movie.poster_path} />
      <InfoBlock
        movie={movie}
        favorite={favorite}
        onToggleFavorite={onToggleFavorite}
      />
      <RatingBlock rating={rating} onSetStar={onSetStar} />
      <Overview
        overview={movie.overview}
        expanded={overviewExpanded}
        onToggle={onToggleOverview}
      />
      <Genres movie={movie} />
    </ScrollView>
  );
}

// -------------------------------------------------------
// 🔹 Subcomponentes puros (também otimizáveis ⭐)
// -------------------------------------------------------

function Poster({ uri }: { uri: string }) {
  countRender('Poster');
  return (
    <Image
      source={{ uri: `https://image.tmdb.org/t/p/w500${uri}` }}
      style={styles.poster}
    />
  );
}

function InfoBlock({
  movie,
  favorite,
  onToggleFavorite,
}: {
  movie: any;
  favorite: boolean;
  onToggleFavorite: () => void;
}) {
  countRender('InfoBlock');
  const formatDate = (date: string): string => {
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  };
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.subtitle}>
          ⭐ {movie.vote_average.toFixed(1)} | Data de lançamento:{' '}
          {formatDate(movie.release_date)}
        </Text>
      </View>

      <View style={{ width: 80, alignItems: 'center' }}>
        <TouchableOpacity
          testID="btn_favorite"
          onPress={onToggleFavorite}
          style={[styles.favoriteBtn, favorite && styles.favoriteBtnActive]}
        >
          <Text style={{ color: favorite ? '#fff' : '#333' }}>
            {favorite ? 'Favorito' : 'Favoritar'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RatingBlock({
  rating,
  onSetStar,
}: {
  rating: number;
  onSetStar: (n: number) => void;
}) {
  countRender('RatingBlock');
  return (
    <View style={{ marginTop: 8, alignItems: 'center' }}>
      <Text style={{ fontSize: 12 }}>Nota</Text>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity
            key={n}
            testID={`star_${n}`}
            onPress={() => onSetStar(n)}
            style={{ padding: 6 }}
          >
            <Text>{n <= rating ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Overview({
  overview,
  expanded,
  onToggle,
}: {
  overview: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  countRender('Overview');
  return (
    <View>
      <Text style={styles.sectionTitle}>Sinopse</Text>
      <TouchableOpacity onPress={onToggle} testID="btn_toggle_overview">
        <Text style={styles.overview}>
          {expanded
            ? overview || 'Sem descrição disponível.'
            : (overview || 'Sem descrição disponível.').slice(0, 180) +
              (overview && overview.length > 180 ? '...' : '')}
        </Text>
        <Text style={{ color: '#007AFF', marginTop: 6, marginLeft: 10 }}>
          {expanded ? 'Recolher' : 'Ver mais'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function Genres({ movie }: { movie: any }) {
  countRender('Genres');
  return (
    <View>
      <Text style={styles.sectionTitle}>Gêneros</Text>
      <Text style={styles.info}>
        {movie.genres?.map((g: any) => g.name).join(', ')}
      </Text>

      <Text style={styles.sectionTitle}>Duração</Text>
      <Text style={styles.info}>{movie.runtime} min</Text>

      <Text style={styles.sectionTitle}>Produção</Text>
      <Text style={styles.info}>
        {movie.production_companies?.map((c: any) => c.name).join(', ')}
      </Text>
    </View>
  );
}

// -------------------------------------------------------
// 🔹 Estilos originais mantidos
// -------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  poster: { width: '100%', height: 400, borderRadius: 12, marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#555', marginBottom: 12 },
  info: { fontSize: 14, color: '#555', marginBottom: 12, paddingHorizontal: 8 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  overview: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  favoriteBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  favoriteBtnActive: { backgroundColor: '#333', borderColor: '#333' },
});
