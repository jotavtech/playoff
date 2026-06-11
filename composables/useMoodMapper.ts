import type { MusicMood } from '~/types/cinematic'
import type { SpotifyTrack } from '~/types/spotify'

/**
 * Music Mood Mapping (PRD §5.7.4).
 * Infere o clima visual da música a partir de metadados disponíveis
 * (sem a Audio Features API, que foi descontinuada).
 */

const NOCTURNAL_WORDS = /night|dark|shadow|void|black|dead|death|cold|winter|ice|alone|empty|noir|midnight|dusk|3am|late|dream|sleep|haunted/i
const BRIGHT_WORDS    = /love|sweet|warm|sun|day|bright|happy|joy|smile|summer|bloom|gold|light|shine|dance|party|feel|alive|rise/i
const HEAVY_WORDS     = /heavy|hard|metal|rage|anger|war|fight|brutal|destroy|chaos|crash|violent|fierce|savage/i
const FAST_WORDS      = /fast|run|race|chase|rush|energy|power|electric|fire|burn|storm|sprint|wild/i
const SOFT_WORDS      = /soft|gentle|quiet|slow|calm|peace|still|tender|whisper|breeze|float|mellow|lullaby/i
const DRAMATIC_WORDS  = /drama|epic|grand|rise|throne|legend|hero|glory|triumph|eternal|infinity|climax/i
const LUXURY_WORDS    = /luxury|gold|silver|diamond|crown|royal|elite|prestige|vogue|couture|label|dior|gucci/i

export function inferMood (track: SpotifyTrack, luminance: number): MusicMood {
  const text = `${track.name} ${track.artists.map(a => a.name).join(' ')}`.toLowerCase()
  const hour = new Date().getHours()

  // Horário noturno (23h–5h)
  if (hour >= 23 || hour <= 4) return 'nocturnal'

  // Heurísticas de keywords (da mais específica para a mais geral)
  if (HEAVY_WORDS.test(text))   return 'heavy'
  if (FAST_WORDS.test(text))    return 'fast'
  if (DRAMATIC_WORDS.test(text)) return 'dramatic'
  if (LUXURY_WORDS.test(text))  return 'luxury'
  if (NOCTURNAL_WORDS.test(text)) return 'nocturnal'
  if (BRIGHT_WORDS.test(text))  return 'bright'
  if (SOFT_WORDS.test(text))    return 'soft'

  // Luminância da capa
  if (luminance < 0.2) return 'nocturnal'
  if (luminance > 0.78) return 'bright'
  if (luminance < 0.38) return 'cold'

  // Popularidade
  if (track.popularity >= 75) return 'luxury'
  if (track.popularity <= 25) return 'minimal'

  return 'soft'
}

/**
 * Converte o mood em ajustes de variáveis CSS da cena.
 * Nunca gera um tema colorido — apenas intensidade/velocidade/contraste.
 */
export function moodToSceneAdjustments (mood: MusicMood): Record<string, string> {
  const map: Record<MusicMood, Record<string, string>> = {
    'nocturnal':         { '--chrome-speed': '0.28', '--motion-intensity': '0.55', '--cinema-depth-shadow': '0.75' },
    'cold':             { '--chrome-speed': '0.35', '--motion-intensity': '0.5',  '--cinema-depth-shadow': '0.65' },
    'soft':             { '--chrome-speed': '0.4',  '--motion-intensity': '0.55', '--cinema-depth-shadow': '0.5' },
    'bright':           { '--chrome-speed': '0.65', '--motion-intensity': '0.75', '--cinema-depth-shadow': '0.35' },
    'fast':             { '--chrome-speed': '1.1',  '--motion-intensity': '0.95', '--cinema-depth-shadow': '0.45' },
    'heavy':            { '--chrome-speed': '0.6',  '--motion-intensity': '0.88', '--cinema-depth-shadow': '0.8' },
    'dramatic':         { '--chrome-speed': '0.5',  '--motion-intensity': '0.9',  '--cinema-depth-shadow': '0.7' },
    'luxury':           { '--chrome-speed': '0.42', '--motion-intensity': '0.68', '--cinema-depth-shadow': '0.55' },
    'minimal':          { '--chrome-speed': '0.22', '--motion-intensity': '0.35', '--cinema-depth-shadow': '0.45' },
    'chaotic-controlled': { '--chrome-speed': '0.9', '--motion-intensity': '1.0',  '--cinema-depth-shadow': '0.6' }
  }
  return map[mood] ?? {}
}
