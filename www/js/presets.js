// Vorschläge beim Anlegen einer Sprache. `tts` = Sprachcode fürs Vorlesen (leer = nicht vorlesen).

export const LANGUAGE_PRESETS = [
  { name: 'Englisch', flag: '🇬🇧', tts: 'en-GB' },
  { name: 'Französisch', flag: '🇫🇷', tts: 'fr-FR' },
  { name: 'Spanisch', flag: '🇪🇸', tts: 'es-ES' },
  { name: 'Latein', flag: '🏛️', tts: '' },
  { name: 'Italienisch', flag: '🇮🇹', tts: 'it-IT' },
  { name: 'Türkisch', flag: '🇹🇷', tts: 'tr-TR' },
  { name: 'Russisch', flag: '🇷🇺', tts: 'ru-RU' },
  { name: 'Polnisch', flag: '🇵🇱', tts: 'pl-PL' },
  { name: 'Niederländisch', flag: '🇳🇱', tts: 'nl-NL' },
  { name: 'Portugiesisch', flag: '🇵🇹', tts: 'pt-PT' },
  { name: 'Griechisch', flag: '🇬🇷', tts: 'el-GR' },
  { name: 'Japanisch', flag: '🇯🇵', tts: 'ja-JP' },
  { name: 'Chinesisch', flag: '🇨🇳', tts: 'zh-CN' },
  { name: 'Arabisch', flag: '🇸🇦', tts: 'ar-SA' },
];

export const TTS_OPTIONS = [
  { code: '', label: 'Nicht vorlesen' },
  { code: 'en-GB', label: 'Englisch (UK)' },
  { code: 'en-US', label: 'Englisch (US)' },
  { code: 'fr-FR', label: 'Französisch' },
  { code: 'es-ES', label: 'Spanisch' },
  { code: 'it-IT', label: 'Italienisch' },
  { code: 'pt-PT', label: 'Portugiesisch' },
  { code: 'nl-NL', label: 'Niederländisch' },
  { code: 'pl-PL', label: 'Polnisch' },
  { code: 'tr-TR', label: 'Türkisch' },
  { code: 'ru-RU', label: 'Russisch' },
  { code: 'el-GR', label: 'Griechisch' },
  { code: 'ja-JP', label: 'Japanisch' },
  { code: 'zh-CN', label: 'Chinesisch' },
  { code: 'ar-SA', label: 'Arabisch' },
  { code: 'la', label: 'Latein (falls vorhanden)' },
];

export const FLAG_CHOICES = ['🌍', '🇬🇧', '🇺🇸', '🇫🇷', '🇪🇸', '🇮🇹', '🇹🇷', '🇷🇺', '🇵🇱', '🇳🇱', '🇵🇹', '🇬🇷', '🇯🇵', '🇨🇳', '🇸🇦', '🇸🇪', '🇩🇰', '🇨🇿', '🏛️', '📚'];
