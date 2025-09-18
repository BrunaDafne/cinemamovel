import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { API_KEY } from '@env';
import { RootStackParamList } from 'src/navigation';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export default function MovieDetailsScreen({ route }: Props) {
  const { movieId } = route.params;
  const [movie, setMovie] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMovieDetails() {
      try {
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

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.container}>
        <Text>Não foi possível carregar os detalhes do filme.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image
        source={{ uri: `https://image.tmdb.org/t/p/w500${movie.poster_path}` }}
        style={styles.poster}
      />
      <Text style={styles.title}>{movie.title}</Text>
      <Text style={styles.info}>
        ⭐ {movie.vote_average.toFixed(1)} | {movie.release_date}
      </Text>

      <Text style={styles.sectionTitle}>Sinopse</Text>
      <Text style={styles.overview}>
        {movie.overview || 'Sem descrição disponível.'}
      </Text>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poster: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  info: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 4,
  },
  overview: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});
