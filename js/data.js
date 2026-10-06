/* ============================================================
   Données du scénario RP — tout est fictif.
   Modifiez librement les profils, les affiliations et les textes.
   ============================================================ */
window.ADN_DATA = {

  /* Durée présumée écoulée depuis le décès (en années) */
  DEATH_YEARS_AGO: 5,

  /* Choix du profil :
       'fixed'  → toujours le profil FIXED_PROFILE_ID (par défaut)
       'random' → tirage au sort dans toute la liste (âge minimal MIN_AGE_AT_DEATH) */
  PROFILE_MODE: 'fixed',
  FIXED_PROFILE_ID: 2308,

  /* Âge minimal au décès accepté en mode 'random' */
  MIN_AGE_AT_DEATH: 16,

  MONTHS: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
           'août', 'septembre', 'octobre', 'novembre', 'décembre'],

  MONTHS_RU: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],

  /* Profils entièrement fictifs. birth = [année, mois, jour] */
  PROFILES: [
    { name: 'Mila Sorokina',    ru: 'Мила Сорокина',       alias: 'Снегирь',  id: 2308, birth: [2008, 3, 14],  sex: ['Femme', 'Женский'], blood: 'A+',  aff: ['Inconnu', 'Неизвестно'],                 dist: ['Chrome Valley', 'Хромовая долина'],   match: 99.5 },
    { name: 'Elias Voss',       ru: 'Элиас Восс',          alias: 'Волк',     id: 1472, birth: [2000, 4, 6],   sex: ['Homme', 'Мужской'], blood: 'O+',  aff: ['Sovereign', 'Суверен'],                 dist: ['Chrome Valley', 'Хромовая долина'],   match: 99.8 },
    { name: 'Mira Kovalenko',   ru: 'Мира Коваленко',      alias: 'Ласточка', id: 931,  birth: [1996, 11, 23], sex: ['Femme', 'Женский'], blood: 'A−',  aff: ['Red Meridian', 'Красный Меридиан'],     dist: ['Port Zarya', 'Порт Заря'],            match: 99.4 },
    { name: 'Dmitri Volkov',    ru: 'Дмитрий Волков',      alias: 'Ржавый',   id: 2208, birth: [1988, 2, 14],  sex: ['Homme', 'Мужской'], blood: 'B+',  aff: ['Syndicat Kuznetsov', 'Синдикат Кузнецова'], dist: ['Ash Terminal', 'Пепельный терминал'], match: 98.9 },
    { name: 'Anya Sokolova',    ru: 'Аня Соколова',        alias: 'Искра',    id: 1845, birth: [2001, 7, 30],  sex: ['Femme', 'Женский'], blood: 'AB+', aff: ['Orbital Ghosts', 'Орбитальные призраки'], dist: ['Sector Nine', 'Сектор Девять'],       match: 99.6 },
    { name: 'Kai Orlov',        ru: 'Кай Орлов',           alias: 'Тень',     id: 457,  birth: [1993, 9, 9],   sex: ['Homme', 'Мужской'], blood: 'O−',  aff: ['Aegis-Tanaka Corp', 'Корпорация Эгида'], dist: ['Cinder Heights', 'Холмы Пепла'],      match: 99.1 },
    { name: 'Lena Marchetti',   ru: 'Лена Маркетти',       alias: 'Метель',   id: 3310, birth: [1999, 1, 17],  sex: ['Femme', 'Женский'], blood: 'A+',  aff: ['Neon Clergy', 'Неоновый клир'],          dist: ['Old Kowloon Annex', 'Старый Коулун'], match: 99.9 },
    { name: 'Viktor Strand',    ru: 'Виктор Странд',       alias: 'Кремень',  id: 788,  birth: [1985, 12, 3],  sex: ['Homme', 'Мужской'], blood: 'B−',  aff: ['Sovereign', 'Суверен'],                 dist: ['Port Zarya', 'Порт Заря'],            match: 98.7 },
    { name: 'Nadia Brandt',     ru: 'Надя Брандт',         alias: 'Сова',     id: 2641, birth: [1998, 5, 21],  sex: ['Femme', 'Женский'], blood: 'O+',  aff: ['Red Meridian', 'Красный Меридиан'],     dist: ['Chrome Valley', 'Хромовая долина'],   match: 99.3 },
    { name: 'Jonas Kral',       ru: 'Йонас Крал',          alias: 'Гвоздь',   id: 1119, birth: [1990, 3, 28],  sex: ['Homme', 'Мужской'], blood: 'A+',  aff: ['Syndicat Kuznetsov', 'Синдикат Кузнецова'], dist: ['Sector Nine', 'Сектор Девять'],       match: 99.0 }
  ],

  /* Étapes du séquençage : [seuil %, texte FR, texte RU] */
  SEQ_STEPS: [
    [0,  'Stabilisation de l\'échantillon',    'Стабилизация образца'],
    [16, 'Séquençage génétique',               'Генетическое секвенирование'],
    [38, 'Analyse des résidus chimiques',      'Анализ химических остатков'],
    [60, 'Estimation de l\'ancienneté du décès', 'Оценка давности смерти'],
    [80, 'Recherche de correspondance',        'Поиск совпадений'],
    [100,'Profil identifié',                   'Профиль установлен']
  ],

  /* Symboles des brins (identifiants → tracés SVG, viewBox 0 0 24 24) */
  SYMBOLS: {
    diamond:  '<path d="M12 2 22 12 12 22 2 12Z"/>',
    triangle: '<path d="M12 3 22 20H2Z"/>',
    circle:   '<circle cx="12" cy="12" r="8.5"/>',
    square:   '<rect x="4" y="4" width="16" height="16"/>',
    cross:    '<path d="M9 2h6v7h7v6h-7v7H9v-7H2V9h7Z"/>'
  },

  COMPLEMENT: { A: 'T', T: 'A', C: 'G', G: 'C' }
};
