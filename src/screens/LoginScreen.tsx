import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, Button, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRenderCount } from '../utils/renderCount';
import { now, logPerf } from '../utils/perf';
import { EXPERIMENTS } from '../experiments';
import { authenticate } from '../api/auth';

type Props = {
  navigation: any;
};

export default function LoginScreen({ navigation }: Props) {
  useRenderCount('LoginScreen'); // conta quantas vezes o componente foi renderizado (para debug)

  const [email, setEmail] = useState('demo@user.com');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);
  const submitStartRef = useRef<number | null>(null);

  const onLogin = useCallback(async () => {
    // 1) Marcar tempo inicial (quando usuário apertou)
    submitStartRef.current = now();

    // 2) Opcional: bloquear UI
    if (EXPERIMENTS.blockUIOnSubmit) setLoading(true);
    try {
      // 3) Chamar API de autenticação (pode ser real ou stub)
      const t0_api = now();
      // authenticate pode respeitar EXPERIMENTS.simulateNetworkDelay para simular latência
      const token = await authenticate(email, password);
      logPerf('auth.request', t0_api);

      // 4) Salvar token (medir tempo de armazenamento)
      const t0_store = now();
      if (EXPERIMENTS.storeTokenSecurely) {
        // aqui você colocaria uma rotina "mais custosa" (ex.: criptografar antes de salvar)
        await AsyncStorage.setItem('secure_token', JSON.stringify({token, ts: Date.now()}));
      } else {
        await AsyncStorage.setItem('token', token);
      }
      logPerf('auth.store', t0_store);

      // 5) (Opcional) prefetch de assets da próxima tela para reduzir jank pós-navegação
      if (EXPERIMENTS.prefetchHomeAssets) {
        // ex.: Image.prefetch(...); ou iniciar fetch de dados do home
      }

      // 6) Navegar e medir até a tela Home ficar "visible" (aqui medimos até chamar navigation.replace)
      const t0_nav = now();
      //if (EXPERIMENTS.lazyLoadHomeScreen) {
        // Se Home for importado dinamicamente (import()), isso aumentará o tempo de navegação
        //const Home = await import('../screens/Home'); // exemplo de code-splitting
        // opcional: fazer algo com Home
      //}
      //navigation.replace('Dashboard');
      navigation.reset({
        index: 0,
        routes: [{ name: 'App' }],
      });
      

      const totalStart = submitStartRef.current!;
      const totalEnd = now();
      logPerf('login.total', totalStart, totalEnd);

      // 7) Mostrar sucesso
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha no login');
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      if (EXPERIMENTS.blockUIOnSubmit) setLoading(false);
    }
  }, [email, password, navigation]);

  return (
    <View style={s.container}>
      <Text style={s.title}>Entrar</Text>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="E-mail"
        autoCapitalize="none"
        keyboardType="email-address"
        style={s.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Senha"
        secureTextEntry
        style={s.input}
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Button title="Entrar" onPress={onLogin} />
      )}
      <Text style={s.hint}>Modo de experimento: {JSON.stringify(EXPERIMENTS)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex:1, justifyContent:'center', padding:20 },
  title: { fontSize:22, marginBottom:12 },
  input: { borderWidth:1, borderColor:'#ccc', padding:10, borderRadius:8, marginBottom:10 },
  hint: { marginTop:12, color:'#666', fontSize:12 }
});
