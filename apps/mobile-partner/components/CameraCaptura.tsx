import { useEffect, useRef, useState } from 'react'
import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera'
import { PartnerIcon } from '@/components/PartnerIcon'
import { partnerDesign } from '@/lib/partner-design'
import type { MidiaCapturada } from '@/lib/conteudo'

// Câmera fullscreen vertical (base dark, como o Explorar do consumer):
// tap = foto · modo vídeo = gravar com corte automático aos 60 s,
// front/back e flash. docs/partner-app/09 §2.

const MAX_SEG = 60

export function CameraCaptura({
  visivel,
  fechar,
  capturado,
}: {
  visivel: boolean
  fechar: () => void
  capturado: (m: MidiaCapturada) => void
}) {
  const [permCam, pedirCam] = useCameraPermissions()
  const [permMic, pedirMic] = useMicrophonePermissions()
  const [modo, setModo] = useState<'foto' | 'video'>('foto')
  const [frente, setFrente] = useState(false)
  const [flash, setFlash] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const cameraRef = useRef<CameraView>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const inicioRef = useRef(0)
  const { colors, radius, spacing, typography } = partnerDesign

  useEffect(() => {
    if (!visivel) return
    if (!permCam?.granted) void pedirCam()
    if (!permMic?.granted) void pedirMic()
  }, [visivel])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const semPermissao = permCam && !permCam.granted && !permCam.canAskAgain

  async function tirarFoto() {
    const foto = await cameraRef.current?.takePictureAsync({ quality: 1 })
    if (foto) {
      capturado({
        tipo: 'foto',
        uri: foto.uri,
        duracaoSeg: null,
        largura: foto.width ?? null,
        altura: foto.height ?? null,
      })
    }
  }

  async function alternarGravacao() {
    if (gravando) {
      cameraRef.current?.stopRecording()
      return
    }

    setGravando(true)
    setSegundos(0)
    inicioRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000))
    }, 500)

    try {
      const video = await cameraRef.current?.recordAsync({ maxDuration: MAX_SEG })
      const duracao = Math.max(1, Math.min(MAX_SEG, Math.round((Date.now() - inicioRef.current) / 1000)))
      if (video) {
        capturado({ tipo: 'video', uri: video.uri, duracaoSeg: duracao, largura: null, altura: null })
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
      setGravando(false)
      setSegundos(0)
    }
  }

  function handleShutter() {
    if (modo === 'foto') void tirarFoto()
    else void alternarGravacao()
  }

  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={fechar}>
      <View style={{ flex: 1, backgroundColor: colors.ink }}>
        {permCam?.granted ? (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={frente ? 'front' : 'back'}
            enableTorch={flash}
            mode={modo === 'video' ? 'video' : 'picture'}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'] }}>
            <PartnerIcon name="camera" size={34} color={colors.inkSoft} />
            <Text style={{ color: colors.white, fontSize: typography.h3.size, fontWeight: '700', marginTop: spacing.md, textAlign: 'center' }}>
              Precisamos da câmera
            </Text>
            <Text style={{ color: '#A4A7AD', textAlign: 'center', marginTop: 6, marginBottom: spacing.xl }}>
              Para fotografar e gravar vídeos da sua loja.
            </Text>
            {semPermissao ? (
              <TouchableOpacity
                onPress={() => void Linking.openSettings()}
                activeOpacity={0.85}
                style={{ backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 22 }}
              >
                <Text style={{ color: colors.ink, fontWeight: '800' }}>Abrir ajustes</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => void pedirCam()}
                activeOpacity={0.85}
                style={{ backgroundColor: colors.accent, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 22 }}
              >
                <Text style={{ color: colors.ink, fontWeight: '800' }}>Permitir câmera</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Topo: fechar + timer + flash */}
        <View
          style={{
            position: 'absolute',
            top: 56,
            left: 0,
            right: 0,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
          }}
        >
          <BotaoRedondo onPress={fechar} icone="back" />
          <View style={{ flex: 1, alignItems: 'center' }}>
            {gravando && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: 'rgba(17,18,22,0.75)',
                  borderRadius: radius.pill,
                  paddingVertical: 5,
                  paddingHorizontal: 12,
                  gap: 6,
                }}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
                <Text style={{ color: colors.white, fontWeight: '800' }}>
                  {String(Math.floor(segundos / 60)).padStart(2, '0')}:{String(segundos % 60).padStart(2, '0')} / 1:00
                </Text>
              </View>
            )}
          </View>
          <BotaoRedondo onPress={() => setFlash((f) => !f)} icone="spark" ativo={flash} />
        </View>

        {/* Base: modo foto/vídeo + shutter + flip */}
        <View style={{ position: 'absolute', bottom: 48, left: 0, right: 0, alignItems: 'center', gap: spacing.lg }}>
          {!gravando && (
            <View style={{ flexDirection: 'row', backgroundColor: 'rgba(17,18,22,0.75)', borderRadius: radius.pill, padding: 4 }}>
              {(['foto', 'video'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setModo(m)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: modo === m ? colors.accent : 'transparent',
                    borderRadius: radius.pill,
                    paddingVertical: 7,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text style={{ color: modo === m ? colors.ink : colors.white, fontWeight: '800', fontSize: typography.bodySm.size, textTransform: 'uppercase' }}>
                    {m === 'foto' ? 'Foto' : 'Vídeo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 44 }}>
            <View style={{ width: 44 }} />
            <TouchableOpacity onPress={handleShutter} activeOpacity={0.8}>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 38,
                  borderWidth: 4,
                  borderColor: colors.white,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <View
                  style={{
                    width: gravando ? 30 : 60,
                    height: gravando ? 30 : 60,
                    borderRadius: gravando ? 8 : 30,
                    backgroundColor: modo === 'video' ? colors.danger : colors.white,
                  }}
                />
              </View>
            </TouchableOpacity>
            <BotaoRedondo onPress={() => setFrente((f) => !f)} icone="camera" desabilitado={gravando} />
          </View>
        </View>
      </View>
    </Modal>
  )
}

function BotaoRedondo({
  onPress,
  icone,
  ativo,
  desabilitado,
}: {
  onPress: () => void
  icone: 'back' | 'camera' | 'spark'
  ativo?: boolean
  desabilitado?: boolean
}) {
  const { colors, radius } = partnerDesign
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={desabilitado}
      activeOpacity={0.8}
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: ativo ? colors.accent : 'rgba(17,18,22,0.75)',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: desabilitado ? 0.4 : 1,
      }}
    >
      <PartnerIcon name={icone} size={20} color={ativo ? colors.ink : colors.white} strokeWidth={2.1} />
    </TouchableOpacity>
  )
}
