import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from './components/Header.jsx';
import Filters from './components/Filters.jsx';
import OperationsOverview from './components/OperationsOverview.jsx';
import PerformanceMetrics from './components/PerformanceMetrics.jsx';
import BarChart from './components/charts/BarChart.jsx';
import BrazilMap from './components/charts/BrazilMap.jsx';
import FileUpload from './components/FileUpload.jsx';
import ExhibitionView from './components/ExhibitionView.jsx';
import dataUtils from './utils/dataUtils';

function KPI_Card({ title, value, unit = '', trendValue = null, trendDirection = 'neutral', lowerIsBetter = false }) {
    const trendColorClass = trendDirection === 'up'
        ? (lowerIsBetter ? 'text-red-600 bg-red-100' : 'text-green-600 bg-green-100')
        : (trendDirection === 'down'
            ? (lowerIsBetter ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100')
            : 'text-slate-600 bg-slate-100');
    const trendIcon = trendDirection === 'up' ? 'fa-arrow-up' : trendDirection === 'down' ? 'fa-arrow-down' : 'fa-minus';
    return (
        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 text-center hover:shadow-lg transition-shadow duration-300 hover:shadow-lg">
            <div className="text-sm font-medium text-slate-500 truncate mb-1">{title}</div>
            <div className="text-3xl lg:text-4xl font-semibold text-slate-900">{value}{unit}</div>
            {trendValue !== null && trendValue !== undefined && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.5 }}
                    className={`mt-2 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${trendColorClass}`}>
                    <i className={`fas ${trendIcon} w-3 h-3`}></i>
                    <span>{trendValue === null || trendValue === undefined ? '-' : (trendValue === '∞' || trendValue === '-∞' ? trendValue : `${trendValue}%`)}</span>
                </motion.div>
            )}
        </div>
    );
}

function Dashboard({ onLogout, user }) {
  const [filters, setFilters] = useState({
    dateRange: 'today',
    state: 'all',
    region: 'all',
  });
  const [selectedOperatorId, setSelectedOperatorId] = useState('all');
  const [selectedMapMetric, setSelectedMapMetric] = useState('totalLigações');
  const [showUpload, setShowUpload] = useState(false);
  const [displayMode, setDisplayMode] = useState('navigation');
  const [selectedMapRegion, setSelectedMapRegion] = useState('all');
  const [metrics, setMetrics] = useState({ current: null, previous: null });
  const [tabulationDistributionNav, setTabulationDistributionNav] = useState([]);
  const [stateMapData, setStateMapData] = useState({});
  const [hourlyData, setHourlyData] = useState([]);
  const [ufRegionsData, setUfRegionsData] = useState([]);
  const [operatorsList, setOperatorsList] = useState([]);
  const [metricsToday, setMetricsToday] = useState({ current: null, previous: null });
  const [hourlyDataToday, setHourlyDataToday] = useState([]);
  const [tabulationDistributionToday, setTabulationDistributionToday] = useState([]);
  const [goalValue, setGoalValue] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);
  const [exhibitionDateRange, setExhibitionDateRange] = useState('week');

  const statesList = useMemo(() => {
    const states = ufRegionsData.map(item => item.uf).sort();
    return states;
  }, [ufRegionsData]);

  const regionsList = useMemo(() => {
    const regions = [...new Set(ufRegionsData.map(item => item.region_name))].sort();
    return regions;
  }, [ufRegionsData]);

  const getUfsInSelectedRegion = useCallback(() => {
    if (filters.region === 'all') {
      return [];
    }
    return ufRegionsData.filter(item => item.region_name === filters.region).map(item => item.uf);
  }, [filters.region, ufRegionsData]);

  const onToggleUpload = useCallback(() => {
    setShowUpload(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    if (displayMode === 'navigation') {
      setFilters(newFilters);
    }
  }, [displayMode]);

  const handleOperatorChange = useCallback((operatorId) => {
    if (displayMode === 'navigation') {
      setSelectedOperatorId(operatorId || 'all');
    }
  }, [displayMode]);

  const handleMapRegionChange = useCallback((region) => {
    if (displayMode === 'navigation') {
      setSelectedMapRegion(region);
    }
  }, [displayMode]);

  const handleMapMetricChange = useCallback((metric) => {
    if (displayMode === 'navigation') {
      setSelectedMapMetric(metric);
    }
  }, [displayMode]);

  const toggleDisplayMode = useCallback(() => {
    setDisplayMode((prevMode) =>
      prevMode === 'navigation' ? 'exhibition' : 'navigation'
    );
  }, []);

  const handleUploadComplete = useCallback(() => {
    setShowUpload(false);
  }, []);

  const handleGoalInputChange = useCallback((event) => {
    const value = event.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setGoalValue(value);
    }
  }, []);

  const handleExhibitionDateRangeChange = useCallback((newDateRange) => {
    setExhibitionDateRange(newDateRange);
  }, []);

  const brazilRegionsOptions = useMemo(
    () => {
      const options = regionsList.map(region => ({ value: region, label: region }));
      options.unshift({ value: 'all', label: 'Sem Destaque' });
      return options;
    }, [regionsList]
  );

  const mapMetricOptions = useMemo(() => [
    { value: 'totalLigações', label: 'Volume de Chamadas' },
    { value: 'taxaSucesso', label: 'Taxa de Sucesso' },
  ], []);

  const fetchDataForFilters = useCallback(async () => {
    const operatorNameFilter = selectedOperatorId && selectedOperatorId !== 'all'
      ? operatorsList.find(op => op.id.toString() === selectedOperatorId)?.operator_name || null
      : null;

    const regionUfs = getUfsInSelectedRegion();

    const dateParams = dataUtils.getDateRangeParams(filters.dateRange, filters.customStartDate, filters.customEndDate);

    const currentFilters = {
      start_date: dateParams.current_start_date,
      end_date: dateParams.current_end_date,
      filter_state: filters.state === 'all' ? null : filters.state,
      filter_operator_name: operatorNameFilter,
      filter_region_ufs: filters.region === 'all' ? null : regionUfs.length > 0 ? regionUfs : ['INVALID_STATE'],
    };

    const previousFilters = {
      start_date: dateParams.previous_start_date,
      end_date: dateParams.previous_end_date,
      filter_state: filters.state === 'all' ? null : filters.state,
      filter_operator_name: operatorNameFilter,
      filter_region_ufs: filters.region === 'all' ? null : regionUfs.length > 0 ? regionUfs : ['INVALID_STATE'],
    }

    setIsLoadingData(true);
    setErrorData(null);
    try {
      const [
        metricsResult,
        tabulationDistributionResult,
        stateMapResult,
        hourlyDataResult,
      ] = await Promise.all([
        dataUtils.getPerformanceMetrics({
          currentFilters: currentFilters,
          previousFilters: previousFilters,
        }),
        dataUtils.getTabulationDistribution(currentFilters),
        dataUtils.getStateData(currentFilters),
        dataUtils.getTimeSeriesData(currentFilters),
      ]);

      if (metricsResult.error) throw metricsResult.error;
      if (tabulationDistributionResult.error) console.error("📊 [Dashboard] Erro ao carregar distribuição de tabulação:", tabulationDistributionResult.error);
      if (stateMapResult.error) console.error("📊 [Dashboard] Erro ao carregar dados do mapa:", stateMapResult.error);
      if (hourlyDataResult.error) console.error("📊 [Dashboard] Erro ao carregar dados horários:", hourlyDataResult.error);

      setMetrics({
        current: metricsResult.current,
        previous: metricsResult.previous,
      });
      setTabulationDistributionNav(tabulationDistributionResult.data || []);
      console.log("📊 [Dashboard] tabulationDistributionNav data recebida:", tabulationDistributionResult.data);

      let stateMapDataTransformed = {};
      if (Array.isArray(stateMapResult.data)) {
        stateMapDataTransformed = stateMapResult.data.reduce((acc, item) => {
          if (item.uf) {
            acc[item.uf] = item;
          }
          return acc;
        }, {});
      }

      setStateMapData(stateMapDataTransformed);
      setHourlyData(hourlyDataResult.data || []);

    } catch (err) {
      console.error("📊 [Dashboard] Erro geral ao carregar dados filtrados:", err);
      setErrorData("Falha ao carregar dados do painel. Tente recarregar a página.");
      setMetrics({ current: null, previous: null });
      setTabulationDistributionNav([]);
      setStateMapData({});
      setHourlyData([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [filters, selectedOperatorId, operatorsList, getUfsInSelectedRegion]);

  const fetchDataForExhibition = useCallback(async () => {
    setIsLoadingData(true);
    setErrorData(null);
    setMetricsToday({ current: null, previous: null });
    setHourlyDataToday([]);
    setTabulationDistributionToday([]);

    const dateParams = dataUtils.getDateRangeParams(exhibitionDateRange);
    const exhibitionRpcFilters = {
      start_date: dateParams.current_start_date,
      end_date: dateParams.current_end_date,
      filter_state: null,
      filter_operator_name: null,
      filter_region_ufs: null,
    };

    const previousDateParams = dataUtils.getDateRangeParams(exhibitionDateRange);

    const previousExhibitionRpcFilters = {
      start_date: previousDateParams.previous_start_date,
      end_date: previousDateParams.previous_end_date,
      filter_state: null,
      filter_operator_name: null,
      filter_region_ufs: null,
    };

    try {
      const metricsExhibitionResult = await dataUtils.getPerformanceMetrics({
        currentFilters: exhibitionRpcFilters,
        previousFilters: previousExhibitionRpcFilters,
      });

      if (metricsExhibitionResult.error) throw metricsExhibitionResult.error;

      const [
        hourlyDataExhibitionResult,
        tabulationDistributionExhibitionResult,
      ] = await Promise.all([
        dataUtils.getTimeSeriesData(exhibitionRpcFilters),
        dataUtils.getTabulationDistribution(exhibitionRpcFilters),
      ]);

      if (hourlyDataExhibitionResult.error) console.error("📊 [Dashboard] Erro ao carregar dados horários de exibição:", hourlyDataExhibitionResult.error);
      if (tabulationDistributionExhibitionResult.error) console.error("📊 [Dashboard] Erro ao carregar tabulações de exibição:", tabulationDistributionExhibitionResult.error);

      setMetricsToday({
        current: metricsExhibitionResult.current || null,
        previous: metricsExhibitionResult.previous || null,
      });
      setHourlyDataToday(hourlyDataExhibitionResult.data || []);
      setTabulationDistributionToday(tabulationDistributionExhibitionResult.data || []);
      console.log("📊 [Dashboard] tabulationDistributionToday data recebida:", tabulationDistributionExhibitionResult.data);

    } catch (err) {
      console.error("📊 [Dashboard] Erro geral ao carregar dados de Exibição:", err);
      setErrorData("Falha ao carregar dados de exibição.");
      setMetricsToday({ current: null, previous: null });
      setHourlyDataToday([]);
      setTabulationDistributionToday([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [exhibitionDateRange]);

  useEffect(() => {
    const fetchInitialLists = async () => {
      try {
        const [operatorsResult, ufRegionsResult] = await Promise.all([
          dataUtils.getOperators(),
          dataUtils.getUfRegions(),
        ]);
        if (operatorsResult.error) console.error("📊 [Dashboard] Erro ao carregar operadores:", operatorsResult.error);
        if (ufRegionsResult.error) console.error("📊 [Dashboard] Erro ao carregar UF-Regiões:", ufRegionsResult.error);

        setOperatorsList(operatorsResult.data || []);
        setUfRegionsData(ufRegionsResult.data || []);

      } catch (err) {
        console.error("📊 [Dashboard] Erro geral ao carregar listas iniciais:", err);
        setErrorData("Falha ao carregar listas iniciais. Tente recarregar a página.");
        setOperatorsList([]);
        setUfRegionsData([]);
        setIsLoadingData(false);
      }
    };
    if (operatorsList.length === 0 || ufRegionsData.length === 0) {
      fetchInitialLists();
    }
  }, [operatorsList.length, ufRegionsData.length]);

  useEffect(() => {
    if (displayMode === 'navigation') {
      if ((operatorsList.length > 0 || selectedOperatorId === 'all') && ufRegionsData.length > 0) {
        fetchDataForFilters();
      } else if (!isLoadingData && ufRegionsData.length === 0 && operatorsList.length === 0) {
        setIsLoadingData(true);
        setErrorData(null);
      } else if (!isLoadingData && (ufRegionsData.length > 0 || operatorsList.length > 0)) {
        fetchDataForFilters();
      }
    }
  }, [filters, selectedOperatorId, operatorsList.length, ufRegionsData.length, displayMode, fetchDataForFilters]);

  useEffect(() => {
    if (displayMode === 'exhibition') {
      fetchDataForExhibition();
    }
  }, [displayMode, exhibitionDateRange, fetchDataForExhibition]);

  const tempoPerdidoTabulations = useMemo(() => [
    'telefone incorreto',
    'recusa',
    'agendamento grupo',
    'recusa cartão tel. não é do cliente - *ligar nos demais*',
    'fidelizado/irá desbloquear',
    'recusa/não tem interesse em desbloquear',
    'caixa postal',
    'ligação caiu',
    'cliente ausente',
    'cliente desligou',
    'ligação muda'
  ].map(tab => tab.toLowerCase()), []);

  const validTabulationDataNav = useMemo(() => {
    if (!tabulationDistributionNav || !Array.isArray(tabulationDistributionNav)) return [];
    return tabulationDistributionNav.map(d => ({
      label: d.label,
      value: d.value
    })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);
  }, [tabulationDistributionNav]);

  const showTabulationPlaceholderNav = !tabulationDistributionNav || tabulationDistributionNav.length === 0 || validTabulationDataNav.length === 0;

  return (
    <div
      data-name="dashboard"
      className={`min-h-screen bg-slate-100 ${
        displayMode === 'exhibition' ? 'exhibition-mode' : ''
      }`}
    >
      <Header
        displayMode={displayMode}
        onToggleMode={toggleDisplayMode}
        onLogout={onLogout}
        showUpload={showUpload}
        onToggleUpload={onToggleUpload}
        user={user}
      />
      {displayMode === 'navigation' ? (
        <main className="dashboard-container">
          {showUpload && (
            <FileUpload onUploadComplete={handleUploadComplete} />
          )}
          <Filters
            filters={filters}
            onFilterChange={handleFilterChange}
            operators={operatorsList}
            selectedOperatorId={selectedOperatorId}
            onOperatorChange={handleOperatorChange}
            states={statesList}
            regions={regionsList}
            ufRegionsData={ufRegionsData}
            disabled={isLoadingData}
            goalValue={goalValue}
            onGoalInputChange={handleGoalInputChange}
          />
          {isLoadingData ? (
            <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-lg">
              <i className="fas fa-spinner fa-spin mr-3"></i> Carregando dados...
              <p className="mt-2 text-sm">Aguardando dados do banco.</p>
            </div>
          ) : errorData ? (
            <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-red-600 text-lg">
              <i className="fas fa-exclamation-triangle mb-2 text-xl"></i>
              <p className="text-base font-semibold">Erro ao carregar dados:</p>
              <p className="mt-1 text-sm text-slate-700">{errorData}</p>
            </div>
          ) : (
            <>
              <PerformanceMetrics
                metrics={metrics.current}
                timeSeriesData={hourlyData}
                goalValue={parseFloat(goalValue) || 0}
                operatorsList={operatorsList}
                selectedOperatorId={selectedOperatorId}
              />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div
                  data-name="metrics-chart-tabulation-distribution"
                  className="bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col"
                >
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Distribuição por Tabulação (Volume Total)
                  </h3>
                  <div className="flex-grow relative" style={{ height: '320px' }}>
                    {showTabulationPlaceholderNav ? (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Sem dados de tabulação para o período/filtros selecionados.
                      </div>
                    ) : (
                      <BarChart
                        data={validTabulationDataNav}
                        horizontal={true}
                        title=""
                      />
                    )}
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 min-h-[450px] flex flex-col">
                  <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                    <h3 className="text-lg font-semibold text-slate-800 whitespace-nowrap">
                      Distribuição Geográfica ({mapMetricOptions.find(opt => opt.value === selectedMapMetric)?.label || 'Métrica'})
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        value={selectedMapRegion}
                        onChange={(e) => handleMapRegionChange(e.target.value)}
                        className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-1 focus::ring-blue-500 focus::border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Selecionar região para destaque no mapa"
                        disabled={isLoadingData}
                      >
                        {brazilRegionsOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedMapMetric}
                        onChange={(e) => handleMapMetricChange(e.target.value)}
                        className="text-xs border border-slate-300 rounded-md px-2 py-1 bg-white shadow-sm focus:outline-none focus:ring-1 focus::ring-blue-500 focus::border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Selecionar métrica para colorir o mapa"
                        disabled={isLoadingData}
                      >
                        {mapMetricOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex-grow relative">
                    {Object.keys(stateMapData).length > 0 ? (
                      <BrazilMap
                        data={stateMapData}
                        displayMode={displayMode}
                        selectedMetric={selectedMapMetric}
                        selectedMapRegion={selectedMapRegion}
                        metricOptions={mapMetricOptions}
                        ufRegionsData={ufRegionsData}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Sem dados geográficos para o período/filtros selecionados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      ) : (
        <main className="dashboard-container p-4">
          <div className="bg-white p-4 rounded-lg shadow-md border border-slate-200 mb-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">Período de Exibição</h3>
            <div className="flex items-center gap-4">
              <label htmlFor="exhibitionDateRange" className="block text-sm font-medium text-slate-700">Período</label>
              <select
                id="exhibitionDateRange"
                value={exhibitionDateRange}
                onChange={(e) => handleExhibitionDateRangeChange(e.target.value)}
                className="text-sm border border-slate-300 rounded-md px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoadingData}
              >
                <option value="today">Hoje</option>
                <option value="week">Últimos 7 Dias</option>
              </select>
            </div>
          </div>
          <ExhibitionView
            metrics={metricsToday.current}
            previousMetrics={metricsToday.previous}
            hourlyData={hourlyDataToday}
            tabulationDistribution={tabulationDistributionToday}
            goalValue={parseFloat(goalValue) || 0}
            operatorsList={operatorsList}
            selectedOperatorId={selectedOperatorId}
            KPI_Card={KPI_Card}
            selectedDateRange={exhibitionDateRange}
            isLoading={isLoadingData}
            error={errorData}
            BrazilMapComponent={
              Object.keys(stateMapData).length > 0 ? (
                <BrazilMap
                  data={stateMapData}
                  displayMode={displayMode}
                  selectedMetric={selectedMapMetric}
                  selectedMapRegion={selectedMapRegion}
                  metricOptions={mapMetricOptions}
                  ufRegionsData={ufRegionsData}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  Sem dados geográficos para o período/filtros selecionados.
                </div>
              )
            }
          />
        </main>
      )}
    </div>
  );
}

export default Dashboard;