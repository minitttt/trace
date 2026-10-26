export const goalOptions = ["Study", "Exam Prep", "Practical Project", "Meeting Notes"] as const;
export const difficultyOptions = ["Beginner", "Intermediate", "Advanced"] as const;
export const audienceOptions = ["Student", "Professional", "Curious Learner"] as const;
export const languageOptions = [
  "English",
  "Spanish",
  "French",
  "German",
  "Hindi",
  "Japanese",
  "Chinese",
  "Arabic",
  "Korean",
  "Portuguese",
  "Italian",
  "Indonesian",
  "Dutch",
  "Turkish",
  "Filipino",
  "Polish",
  "Swedish",
  "Bulgarian",
  "Romanian",
  "Czech",
  "Greek",
  "Finnish",
  "Croatian",
  "Malay",
  "Slovak",
  "Danish",
  "Tamil",
  "Ukrainian",
  "Russian",
] as const;

export type SupportedLanguage = (typeof languageOptions)[number];

export const languageCodes: Record<SupportedLanguage, string> = {
  English: "en",
  Spanish: "es",
  French: "fr",
  German: "de",
  Hindi: "hi",
  Japanese: "ja",
  Chinese: "zh",
  Arabic: "ar",
  Korean: "ko",
  Portuguese: "pt",
  Italian: "it",
  Indonesian: "id",
  Dutch: "nl",
  Turkish: "tr",
  Filipino: "fil",
  Polish: "pl",
  Swedish: "sv",
  Bulgarian: "bg",
  Romanian: "ro",
  Czech: "cs",
  Greek: "el",
  Finnish: "fi",
  Croatian: "hr",
  Malay: "ms",
  Slovak: "sk",
  Danish: "da",
  Tamil: "ta",
  Ukrainian: "uk",
  Russian: "ru",
};

export const languageLocales: Record<SupportedLanguage, string> = {
  English: "en-US",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Hindi: "hi-IN",
  Japanese: "ja-JP",
  Chinese: "zh-CN",
  Arabic: "ar-SA",
  Korean: "ko-KR",
  Portuguese: "pt-BR",
  Italian: "it-IT",
  Indonesian: "id-ID",
  Dutch: "nl-NL",
  Turkish: "tr-TR",
  Filipino: "fil-PH",
  Polish: "pl-PL",
  Swedish: "sv-SE",
  Bulgarian: "bg-BG",
  Romanian: "ro-RO",
  Czech: "cs-CZ",
  Greek: "el-GR",
  Finnish: "fi-FI",
  Croatian: "hr-HR",
  Malay: "ms-MY",
  Slovak: "sk-SK",
  Danish: "da-DK",
  Tamil: "ta-IN",
  Ukrainian: "uk-UA",
  Russian: "ru-RU",
};

export function getLanguageCode(language: string) {
  return languageCodes[language as SupportedLanguage] ?? "en";
}

export function getLanguageLocale(language: string) {
  return languageLocales[language as SupportedLanguage] ?? "en-US";
}

export const processingStages = [
  {
    key: "uploading",
    label: "Uploading",
    description: "Securing your source in your private library.",
  },
  {
    key: "reading_source",
    label: "Reading source",
    description: "Opening and understanding the source.",
  },
  {
    key: "extracting_content",
    label: "Extracting content",
    description: "Finding the transcript, chapters, concepts, and examples.",
  },
  {
    key: "creating_material",
    label: "Creating learning material",
    description: "Shaping a study path around your goals.",
  },
  {
    key: "preparing_tutor",
    label: "Preparing tutor",
    description: "Your lesson context is being indexed for questions.",
  },
  { key: "complete", label: "Complete", description: "Your lesson workspace is ready." },
] as const;
