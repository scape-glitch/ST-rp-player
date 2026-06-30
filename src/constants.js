export const PFX = 'rp-player';
export const LS_KEY = 'rp_player_pos_v4';
export const LS_FAB = 'rp_player_fab_v1';
export const LS_CFG = 'rp_player_cfg_v1';
export const LS_QUEUE = 'rp_player_queue_v1';
export const LS_LIB = 'rp_player_lib_v1';
export const LS_RADIO_FAV = 'rp_player_radiofav_v1';
export const LS_RP_REJECTED = 'rp_player_rp_rejected_v1';
export const LS_SIZE = 'rp_player_size_v1';
export const DEFAULT_JAMENDO_KEY = '6fcc94f7';
export const DEFAULT_YT_KEY = 'AIzaSyDMuAcY3e7h6EDCybpGVuwGbvq7lYJB18A';
export const BAIBAI_JS = 'https://drive.baibai.cv/f/ZKEBuW/Music.js';

export const ALL_LS_KEYS = [
  LS_KEY, LS_FAB, LS_CFG, LS_QUEUE, LS_LIB, LS_RADIO_FAV, LS_RP_REJECTED, LS_SIZE,
  'rp_player_state_v1', 'rp_player_pos_v2', 'rp_player_pos_v3', 'liquidGlassPosition'
];

export const THEMES = ['default', 'glass', 'neon', 'paper', 'minimal'];

export const FAV_CHAT_KEY = '__favorites__';

export const SOMA_STATIONS = [
  { name: 'Drone Zone', url: 'https://ice1.somafm.com/dronezone-128-mp3', tag: 'ambient/космос' },
  { name: 'Groove Salad', url: 'https://ice1.somafm.com/groovesalad-128-mp3', tag: 'чилл/даунтемпо' },
  { name: 'Groove Salad Classic', url: 'https://ice1.somafm.com/gsclassic-128-mp3', tag: 'чилл/классика Soma' },
  { name: 'Deep Space One', url: 'https://ice1.somafm.com/deepspaceone-128-mp3', tag: 'тёмный эмбиент' },
  { name: 'Space Station Soma', url: 'https://ice1.somafm.com/spacestation-128-mp3', tag: 'электро/спейс' },
  { name: 'Mission Control', url: 'https://ice1.somafm.com/missioncontrol-128-mp3', tag: 'эмбиент/космос' },
  { name: 'Lush', url: 'https://ice1.somafm.com/lush-128-mp3', tag: 'вокал/мечтательное' },
  { name: 'Beat Blender', url: 'https://ice1.somafm.com/beatblender-128-mp3', tag: 'хаус/даунтемпо' },
  { name: 'Secret Agent', url: 'https://ice1.somafm.com/secretagent-128-mp3', tag: 'спай/джаз/нуар' },
  { name: 'Dub Step Beyond', url: 'https://ice1.somafm.com/dubstep-128-mp3', tag: 'дабстеп/бас' },
  { name: 'DEF CON Radio', url: 'https://ice1.somafm.com/defcon-128-mp3', tag: 'тёмное электро' },
  { name: 'The Trip', url: 'https://ice1.somafm.com/thetrip-128-mp3', tag: 'прог/транс' },
  { name: 'Black Rock FM', url: 'https://ice1.somafm.com/brfm-128-mp3', tag: 'разное/burning man' },
  { name: 'Indie Pop Rocks', url: 'https://ice1.somafm.com/indiepop-128-mp3', tag: 'инди-поп/альтернатива' },
  { name: 'Metal Detector', url: 'https://ice1.somafm.com/metal-128-mp3', tag: 'метал' },
  { name: 'Folk Forward', url: 'https://ice1.somafm.com/folkfwd-128-mp3', tag: 'фолк/инди-фолк' },
  { name: 'Seven Inch Soul', url: 'https://ice1.somafm.com/7soul-128-mp3', tag: 'соул/фанк' },
  { name: 'Suburbs of Goa', url: 'https://ice1.somafm.com/suburbsofgoa-128-mp3', tag: 'world/desi' },
  { name: 'Vaporwaves', url: 'https://ice1.somafm.com/vaporwaves-128-mp3', tag: 'вейпорвейв' },
  { name: 'Sonic Universe', url: 'https://ice1.somafm.com/sonicuniverse-128-mp3', tag: 'авангард-джаз' },
  { name: 'Fluid', url: 'https://ice1.somafm.com/fluid-128-mp3', tag: 'хип-хоп/трип-хоп' },
  { name: 'Illinois Street Lounge', url: 'https://ice1.somafm.com/illstreet-128-mp3', tag: 'lounge/retro' },
  { name: 'Boot Liquor', url: 'https://ice1.somafm.com/bootliquor-128-mp3', tag: 'americana/country' },
  { name: 'BAGeL Radio', url: 'https://ice1.somafm.com/bagel-128-mp3', tag: 'альтернатива/инди/андерграунд' },
  { name: 'Doomed', url: 'https://ice1.somafm.com/doomed-128-mp3', tag: 'dark/industrial/doom' },
  { name: 'PopTron', url: 'https://ice1.somafm.com/poptron-128-mp3', tag: 'electropop/synthpop' },
  { name: 'Cliqhop IDM', url: 'https://ice1.somafm.com/cliqhop-128-mp3', tag: 'idm/glitch' },
  { name: 'Digitalis', url: 'https://ice1.somafm.com/digitalis-128-mp3', tag: 'инди-электро/альт' },
  { name: 'Underground 80s', url: 'https://ice1.somafm.com/u80s-128-mp3', tag: 'андерграунд/80s/post-punk' },
  { name: 'Covers', url: 'https://ice1.somafm.com/covers-128-mp3', tag: 'каверы/разное' }
];

export const RADIO_CHIPS = [
  'jazz', 'lofi', 'ambient', 'rock', 'classical', 'chill', 'electronic', 'pop', 'metal', 'folk',
  'rap', 'hip-hop', 'trip-hop', 'alternative', 'indie', 'underground', 'punk', 'post-punk',
  'industrial', 'darkwave', 'goth', 'blues', 'breakcore', 'drum and bass', 'dubstep',
  'synthpop', 'vaporwave', 'funk', 'soul'
];

export const RP_LANGS = [
  { id: '', label: 'Любой' },
  { id: 'English', label: 'English' },
  { id: 'Russian', label: 'Русский' },
  { id: 'Japanese', label: '日本語' },
  { id: 'French', label: 'Français' },
  { id: 'German', label: 'Deutsch' },
  { id: 'Korean', label: '한국어' },
  { id: 'Chinese', label: '中文' },
  { id: 'Spanish', label: 'Español' },
  { id: 'Italian', label: 'Italiano' }
];

export const RP_GENRES = [
  { id: '', label: 'Любой' },
  { id: 'rock', label: 'Рок' },
  { id: 'pop', label: 'Поп' },
  { id: 'metal', label: 'Метал' },
  { id: 'jazz', label: 'Джаз' },
  { id: 'classical', label: 'Классика' },
  { id: 'electronic', label: 'Электроника' },
  { id: 'ambient', label: 'Эмбиент' },
  { id: 'lofi', label: 'Lo-fi' },
  { id: 'hip-hop', label: 'Хип-хоп' },
  { id: 'folk', label: 'Фолк' },
  { id: 'blues', label: 'Блюз' },
  { id: 'soundtrack', label: 'Саундтрек' },
  { id: 'indie', label: 'Инди' },
  { id: 'punk', label: 'Панк' },
  { id: 'meme', label: 'Мемы' }
];

export const SWATCHES = ['#ff2fd0', '#7aa6ff', '#00e0c6', '#ffb02e', '#ff5c5c', '#a06bff', '#3ad97f', '#ff8fb3'];
export const TEXT_SWATCHES = ['#ffffff', '#000000', '#f0f0f5', '#3a2f1c', '#cccccc', '#ffe9a8', '#a8e0ff', '#ffb3c6'];

export const MODE_LONG_PRESS_MS = 600;
export const MODE_SWITCH_COOLDOWN_MS = 350;
export const MODE_MOVE_CANCEL_PX = 10;
