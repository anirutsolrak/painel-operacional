import {
  fetchDashboardMetricsWithTrend,
  fetchStatusDistribution,
  fetchHourlyCallCounts,
  fetchTabulationDistribution,
  fetchStateMapData,
  fetchOperators, // Importar a versão que chama a RPC
  fetchUfRegions
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

function getDateRangeParams(dateRange, customStartDate = null, customEndDate = null) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  let current_start_date;
  let current_end_date = new Date(now);
  let previous_start_date;
  let previous_end_date;
  if (dateRange === 'custom' && customStartDate && customEndDate) {
    current_start_date = new Date(customStartDate);
    current_end_date = new Date(customEndDate);
    current_end_date.setHours(23, 59, 59, 999);
    const daysDiff = Math.ceil((current_end_date - current_start_date) / (1000 * 60 * 60 * 24));
    previous_start_date = new Date(current_start_date);
    previous_start_date.setDate(previous_start_date.getDate() - daysDiff);
    previous_end_date = new Date(current_start_date);
    previous_end_date.setDate(previous_end_date.getDate() - 1);
    previous_end_date.setHours(23, 59, 59, 999);
  } else {
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
        current_start_date = new Date(today);
        current_end_date = new Date(today);
        current_end_date.setHours(23, 59, 59, 999);
        previous_start_date = new Date(today);
        previous_start_date.setDate(today.getDate() - 1);
        previous_end_date = new Date(previous_start_date);
        previous_end_date.setHours(23, 59, 59, 999);
    }
  }
  return {
    current_start_date: current_start_date ? current_start_date.toISOString() : '',
    current_end_date: current_end_date ? current_end_date.toISOString() : '',
    previous_start_date: previous_start_date ? previous_start_date.toISOString() : '',
    previous_end_date: previous_end_date ? previous_end_date.toISOString() : '',
  };
}

const getPerformanceMetrics = fetchDashboardMetricsWithTrend;
const getTimeSeriesData = fetchHourlyCallCounts;
const getStatusDistribution = fetchStatusDistribution;
const getTabulationDistribution = fetchTabulationDistribution;
const getStateData = fetchStateMapData;
const getOperators = fetchOperators;
const getUfRegions = fetchUfRegions;


const dataUtils = {
  getPerformanceMetrics,
  getTimeSeriesData,
  getStatusDistribution,
  getTabulationDistribution,
  getStateData,
  getOperators,
  getUfRegions,
  getDateRangeParams,
  formatDuration,
  formatPercentage,
  calculateTrend,
};

export default dataUtils;