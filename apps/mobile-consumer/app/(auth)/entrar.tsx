import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { supabase } from '@/lib/supabase'

export default function TelaEntrar() {
  const [modo, setModo] = useState<'entrar' | 'cadastrar' | 'confirmar'>('entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  function validar() {
    if (!email.trim()) return 'Digite seu email.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return 'Email inválido.'
    if (!senha) return 'Digite sua senha.'
    if (modo === 'cadastrar' && senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.'
    return null
  }

  async function handleSubmit() {
    const erroValidacao = validar()
    if (erroValidacao) {
      setErro(erroValidacao)
      return
    }

    setCarregando(true)
    setErro(null)

    if (modo === 'cadastrar') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: senha,
        options: { data: { role: 'consumer' } },
      })
      setCarregando(false)
      if (error) {
        setErro(error.message === 'User already registered'
          ? 'Este email já está cadastrado.'
          : 'Não foi possível criar a conta. Tente novamente.')
        return
      }
      // Se não há sessão, o Supabase exige confirmação de email
      if (!data.session) {
        setErro(null)
        setModo('confirmar')
        return
      }
      router.replace('/(tabs)')
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      })
      setCarregando(false)
      if (error) {
        setErro('Email ou senha incorretos.')
        return
      }
      router.replace('/(tabs)')
    }
  }

  if (modo === 'confirmar') {
    return (
      <View className="flex-1 bg-creme px-6 pt-24 pb-10">
        <View className="items-center mb-10">
          <View className="w-20 h-20 bg-verde-medio/20 rounded-full items-center justify-center mb-6">
            <Text className="text-4xl">✉️</Text>
          </View>
          <Text className="text-2xl font-bold text-verde-profundo text-center mb-3">
            Confirme seu email
          </Text>
          <Text className="text-gray-500 text-center leading-6">
            Enviamos um link de confirmação para{'\n'}
            <Text className="font-medium text-gray-700">{email}</Text>
            {'\n\n'}Após confirmar, volte aqui e faça login.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setModo('entrar'); setSenha('') }}
          className="bg-verde-profundo py-4 rounded-2xl items-center"
          activeOpacity={0.85}
        >
          <Text className="text-white font-semibold text-base">Ir para o login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-creme"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          <View className="mb-10">
            <Text className="text-3xl font-bold text-verde-profundo mb-2">
              {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
            </Text>
            <Text className="text-gray-500 leading-6">
              {modo === 'entrar'
                ? 'Acesse sua conta para continuar.'
                : 'Preencha seus dados para começar.'}
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Email</Text>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setErro(null) }}
                placeholder="seu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1.5">Senha</Text>
              <TextInput
                value={senha}
                onChangeText={(t) => { setSenha(t); setErro(null) }}
                placeholder={modo === 'cadastrar' ? 'Mínimo 6 caracteres' : '••••••••'}
                secureTextEntry
                autoCapitalize="none"
                autoComplete={modo === 'cadastrar' ? 'new-password' : 'current-password'}
                className="border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-800 bg-white"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {erro && <Text className="text-red-500 text-sm">{erro}</Text>}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={carregando}
              className="bg-verde-profundo py-4 rounded-2xl items-center mt-2"
              activeOpacity={0.85}
            >
              {carregando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold text-base">
                  {modo === 'entrar' ? 'Entrar' : 'Criar conta'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => { setModo(modo === 'entrar' ? 'cadastrar' : 'entrar'); setErro(null) }}
              className="py-3 items-center"
              activeOpacity={0.7}
            >
              <Text className="text-sm text-verde-medio">
                {modo === 'entrar'
                  ? 'Não tem conta? Criar conta'
                  : 'Já tem conta? Entrar'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs text-gray-400 text-center mt-8 leading-5">
            Ao continuar, você concorda com os Termos de Uso e a
            Política de Privacidade da plataforma.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
