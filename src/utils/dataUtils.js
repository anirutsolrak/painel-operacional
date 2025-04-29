import {
  fetchDashboardMetricsWithTrend,
  fetchStatusDistribution,
  fetchHourlyCallCounts,
  fetchTabulationDistribution,
  fetchStateMapData,
  fetchOperators,
  fetchStates,
  fetchRegions
} from './supabaseClient';

function formatDuration(seconds) {
  if (
    isNaN(seconds) ||
    seconds === null ||
    seconds === undefined ||
    seconds < 0
  )
    return '00:00';

  const totalSeconds = Math.round(seconds);
  const days = Math.floor(totalSeconds / (24 * 3600));
  const remainingSecondsAfterDays = totalSeconds % (24 * 3600);
  const hours = Math.floor(remainingSecondsAfterDays / 3600);
  const minutes = Math.floor((remainingSecondsAfterDays % 3600) / 60);
  const remainingSeconds = remainingSecondsAfterDays % 60;

  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');
  const paddedSeconds = remainingSeconds.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}d ${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else if (hours > 0) {
    return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
  } else {
    return `${paddedMinutes}:${paddedSeconds}`;
  }
}

function formatPercentage(value) {
  if (isNaN(value) || value === null || value === undefined)
    return '0.0%';
  const numValue = parseFloat(value);
  if (isNaN(numValue)) return '0.0%';
  return `${(numValue * 100).toFixed(1)}%`;
}

function calculateTrend(current, previous) {
   if (
      previous === undefined ||
      previous === null ||
      isNaN(current) ||
      isNaN(previous) ||
      current === null ||
      previous === null
   ) {
       return { value: null, direction: 'neutral' };
   }
   if (previous === 0) {
       if (current > 0) return { value: '∞', direction: 'up' };
       if (current < 0) return { value: '-∞', direction: 'down' };
       return { value: '0.0', direction: 'neutral' };
   }

   if (current === 0) {
        if (previous > 0) return { value: '∞', direction: 'down' };
        if (previous < 0) return { value: '-∞', direction: 'up' };
        return { value: '0.0', direction: 'neutral' };
   }

  const trend = ((current - previous) / previous) * 100;
  if (isNaN(trend)) return { value: null, direction: 'neutral' };

  let direction = 'neutral';
  if (trend > 0.1) direction = 'up';
  if (trend < -0.1) direction = 'down';

  return { value: Math.abs(trend).toFixed(1), direction: direction };
}

const getPerformanceMetrics = async (filtros = {}) => {
  const { data: current, previous, error } = await fetchDashboardMetricsWithTrend(filtros);
  return {
      current: current || {
           totalLigações: 0,
           ligaçõesAtendidasCount: 0,
           ligaçõesAbandonadasCount: 0,
           ligaçõesFalhaCount: 0,
           tma: 0,
           taxaSucesso: 0,
           taxaNaoEfetivo: 0,
           sucessoTabulacoesCount: 0,
           taxaAbandono: 0,
           tempoPerdidoSegundos: 0
      },
      previous: previous || {
           totalLigações: 0,
           ligaçõesAtendidasCount: 0,
           ligaçõesAbandonadasCount: 0,
           ligaçõesFalhaCount: 0,
           tma: 0,
           taxaSucesso: 0,
           taxaNaoEfetivo: 0,
           sucessoTabulacoesCount: 0,
           taxaAbandono: 0,
           tempoPerdidoSegundos: 0
      },
      error: error
  };
};

const getTimeSeriesData = async (filtros = {}) => {
  const { data, error } = await fetchHourlyCallCounts(filtros);
  return { data: data || [], error: error };
};

const getStatusDistribution = async (filtros = {}) => {
  const { data, error } = await fetchStatusDistribution(filtros);
  return { data: data || [], error: error };
}

const getTabulationDistribution = async (filtros = {}) => {
   const { data, error } = await fetchTabulationDistribution(filtros);
   return { data: data || [], error: error };
};

const getStateData = async (filtros = {}) => {
  const { data, error } = await fetchStateMapData(filtros);
  return { data: data || [], error: error };
};

const getOperators = async () => {
  const { data, error } = await fetchOperators();
  return { data: data || [], error: error };
};

const getStates = async () => {
  const { data, error } = await fetchStates();
  return { data: data || [], error: error };
};

const getRegions = async () => {
    const { data, error } = await fetchRegions();
    return { data: data || [], error: error };
};

function getDateRangeParams(dateRange) {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    let current_start_date;
    let current_end_date = new Date(now);

    let previous_start_date;
    let previous_end_date;

    switch (dateRange) {
        case 'today':
            current_start_date = new Date(today);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
            previous_start_date = new Date(today);
            previous_start_date.setDate(today.getDate() - 1);
            previous_end_date = new Date(previous_start_date);
            previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'yesterday':
             const yesterday = new Date(today);
             yesterday.setDate(today.getDate() - 1);
             current_start_date = new Date(yesterday);
             current_end_date = new Date(yesterday);
             current_end_date.setHours(23, 59, 59, 999);
             previous_start_date = new Date(yesterday);
             previous_start_date.setDate(yesterday.getDate() - 1);
             previous_end_date = new Date(previous_start_date);
             previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - 6);
            current_start_date = new Date(startOfWeek);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
            previous_start_date = new Date(startOfWeek);
            previous_start_date.setDate(startOfWeek.getDate() - 7);
            previous_end_date = new Date(startOfWeek);
            previous_end_date.setDate(startOfWeek.getDate() - 1);
            previous_end_date.setHours(23, 59, 59, 999);
            break;
        case 'month':
            const startOfMonth = new Date(today);
            startOfMonth.setDate(today.getDate() - 29);
            current_start_date = new Date(startOfMonth);
            current_end_date = new Date(today);
            current_end_date.setHours(23, 59, 59, 999);
             previous_start_date = new Date(startOfMonth);
             previous_start_date.setDate(startOfMonth.getDate() - 30);
             previous_end_date = new Date(startOfMonth);
             previous_end_date.setDate(startOfMonth.getDate() - 1);
             previous_end_date.setHours(23, 59, 59, 999);
            break;
        default:
            current_start_date = null;
            current_end_date = null;
            previous_start_date = null;
            previous_end_date = null;
    }

    return {
        current_start_date: current_start_date ? current_start_date.toISOString() : null,
        current_end_date: current_end_date ? current_end_date.toISOString() : null,
        previous_start_date: previous_start_date ? previous_start_date.toISOString() : null,
        previous_end_date: previous_end_date ? previous_end_date.toISOString() : null,
    };
}

const stateRegions = {
    'AC': 'Norte', 'AM': 'Norte', 'AP': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
    'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
    'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MS': 'Centro-Oeste', 'MT': 'Centro-Oeste',
    'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
    'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
};

const dataUtils = {
  getPerformanceMetrics,
  getTimeSeriesData,
  getStatusDistribution,
  getTabulationDistribution,
  getStateData,
  getOperators,
  getStates,
  getRegions,
  getDateRangeParams,

  formatDuration,
  formatPercentage,
  calculateTrend,

  stateRegions,
};

export default dataUtils;