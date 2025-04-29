import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

import Header from './components/Header.jsx';
import Filters from './components/Filters.jsx';
import OperationsOverview from './components/OperationsOverview.jsx';
import PerformanceMetrics from './components/PerformanceMetrics.jsx';
import BarChart from './components/charts/BarChart.jsx';
import BrazilMap from './components/charts/BrazilMap.jsx';
import FileUpload from './components/FileUpload.jsx';
import LineChart from './components/charts/LineChart.jsx';
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
  const [statesList, setStatesList] = useState([]);
  const [operatorsList, setOperatorsList] = useState([]);
  const [regionsList, setRegionsList] = useState([]);
  const [metricsToday, setMetricsToday] = useState({ current: null, previous: null });
  const [hourlyDataToday, setHourlyDataToday] = useState([]);
  const [tabulationDistributionToday, setTabulationDistributionToday] = useState([]);
  const [goalValue, setGoalValue] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorData, setErrorData] = useState(null);

   const [exhibitionDateRange, setExhibitionDateRange] = useState('week');


  const onToggleUpload = useCallback(() => {
    console.log("📊 [Dashboard] Toggling upload visibility");
    setShowUpload(prev => !prev);
  }, []);

  const handleFilterChange = useCallback((newFilters) => {
    if (displayMode === 'navigation') {
      console.log("📊 [Dashboard] Filter Change:", newFilters);
      setFilters(newFilters);
    }
  }, [displayMode]);

  const handleOperatorChange = useCallback((operatorId) => {
    if (displayMode === 'navigation') {
      console.log("📊 [Dashboard] Operator Change:", operatorId);
      setSelectedOperatorId(operatorId || 'all');
    }
  }, [displayMode]);

  const handleMapRegionChange = useCallback((region) => {
    if (displayMode === 'navigation') {
      console.log("📊 [Dashboard] Map Region Change:", region);
      setSelectedMapRegion(region);
    }
  }, [displayMode]);

  const handleMapMetricChange = useCallback((metric) => {
    if (displayMode === 'navigation') {
      console.log("📊 [Dashboard] Map Metric Change:", metric);
      setSelectedMapMetric(metric);
    }
  }, [displayMode]);

  const toggleDisplayMode = useCallback(() => {
    console.log("📊 [Dashboard] Toggling display mode");
    setDisplayMode((prevMode) =>
      prevMode === 'navigation' ? 'exhibition' : 'navigation'
    );
  }, []);

  const handleUploadComplete = useCallback(() => {
    console.log("📊 [Dashboard] Upload Complete");
    setShowUpload(false);
  }, []);

  const handleGoalInputChange = useCallback((event) => {
    const value = event.target.value;
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setGoalValue(value);
    }
  }, []);

   const handleExhibitionDateRangeChange = useCallback((newDateRange) => {
       console.log("📊 [Dashboard] Exhibition Date Range Change:", newDateRange);
       setExhibitionDateRange(newDateRange);
   }, []);


  const brazilRegions = useMemo(
    () => [
      'all',
      'Norte',
      'Nordeste',
      'Centro-Oeste',
      'Sudeste',
      'Sul'
    ],
    []
  );

  const mapMetricOptions = useMemo(() => [
    { value: 'totalLigações', label: 'Volume de Chamadas' },
    { value: 'taxaSucesso', label: 'Taxa de Sucesso' },
  ], []);

  const canFetchFilteredData = operatorsList.length > 0 || selectedOperatorId === 'all';


  const fetchDataForFilters = useCallback(async () => {
    console.log("📊 [Dashboard fetchDataForFilters] Executing fetch for navigation mode.");
    const operatorNameFilter = selectedOperatorId && selectedOperatorId !== 'all'
      ? operatorsList.find(op => op.id.toString() === selectedOperatorId)?.operator_name || null
      : null;
    console.log("📊 [Dashboard fetchDataForFilters] Derivando operatorNameFilter para busca de dados:", operatorNameFilter);

    const dateParams = dataUtils.getDateRangeParams(filters.dateRange);
    console.log("📊 [Dashboard fetchDataForFilters] Datas calculadas:", dateParams);


    const currentFilters = {
      start_date: dateParams.current_start_date,
      end_date: dateParams.current_end_date,
      filter_state: filters.state === 'all' ? null : filters.state,
      filter_operator_name: operatorNameFilter,
      filter_region: filters.region === 'all' ? null : filters.region,
    };
    console.log("📊 [Dashboard fetchDataForFilters] Filtros para RPCs (current period):", currentFilters);

     const previousFilters = {
         start_date: dateParams.previous_start_date,
         end_date: dateParams.previous_end_date,
         filter_state: filters.state === 'all' ? null : filters.state,
         filter_operator_name: operatorNameFilter,
         filter_region: filters.region === 'all' ? null : filters.region,
     }
     console.log("📊 [Dashboard fetchDataForFilters] Filtros para RPCs (previous period):", previousFilters);


    setIsLoadingData(true);
    setErrorData(null);
    try {
      console.log("📊 [Dashboard fetchDataForFilters] Calling Promise.all for filtered data...");
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

      console.log("📊 [Dashboard] Raw metricsResult:", metricsResult);
      console.log("📊 [Dashboard] Raw tabulationDistributionResult:", tabulationDistributionResult);
      console.log("📊 [Dashboard] Raw stateMapResult:", stateMapResult);
      console.log("📊 [Dashboard] Raw hourlyDataResult:", hourlyDataResult);


      if (metricsResult.error) throw metricsResult.error;
      if (tabulationDistributionResult.error) console.error("📊 [Dashboard] Erro ao carregar distribuição de tabulação:", tabulationDistributionResult.error);
      if (stateMapResult.error) console.error("📊 [Dashboard] Erro ao carregar dados do mapa:", stateMapResult.error);
      if (hourlyDataResult.error) console.error("📊 [Dashboard] Erro ao carregar dados horários:", hourlyDataResult.error);


      setMetrics({
        current: metricsResult.current,
        previous: metricsResult.previous,
      });
      setTabulationDistributionNav(tabulationDistributionResult.data || []);

      let stateMapDataTransformed = {};
      if (Array.isArray(stateMapResult.data)) {
        stateMapDataTransformed = stateMapResult.data.reduce((acc, item) => {
          if (item.uf) {
            acc[item.uf] = item;
          }
          return acc;
        }, {});
        console.log("📍🗺️ [Dashboard fetchDataForFilters] stateMapData transformed:", stateMapDataTransformed);

      } else {
        console.warn("📍🗺️ [Dashboard] stateMapResult.data is not an array. Initializing stateMapDataTransformed to {}.", stateMapResult.data);
      }

      setStateMapData(stateMapDataTransformed);
      setHourlyData(hourlyDataResult.data || []);
      console.log("📊 [Dashboard fetchDataForFilters] Dados filtrados Navegação carregados.", { metrics: metricsResult.current, tabulationDistributionNav: (tabulationDistributionResult.data || []).length, stateMapData: Object.keys(stateMapDataTransformed).length, hourlyData: (hourlyDataResult.data || []).length });

    } catch (err) {
      console.error("📊 [Dashboard] Erro geral ao carregar dados filtrados:", err);
      setErrorData("Falha ao carregar dados do painel. Tente recarregar a página.");
      setMetrics({ current: null, previous: null });
      setTabulationDistributionNav([]);
      setStateMapData({});
      setHourlyData([]);
    } finally {
      setIsLoadingData(false);
      console.log("📊 [Dashboard fetchDataForFilters] Carregamento finalizado.");
    }
  }, [filters, selectedOperatorId, operatorsList]);


  const fetchDataForExhibition = useCallback(async () => {
    console.log("📊 [Dashboard fetchDataForExhibition] Executing fetch for exhibition mode.");

    setIsLoadingData(true);
    setErrorData(null);
    setMetricsToday({ current: null, previous: null });
    setHourlyDataToday([]);
    setTabulationDistributionToday([]);
    console.log("📊 [Dashboard fetchDataForExhibition] Cleared previous exhibition data state.");

    const dateParams = dataUtils.getDateRangeParams(exhibitionDateRange);
     const exhibitionRpcFilters = {
         start_date: dateParams.current_start_date,
         end_date: dateParams.current_end_date,
         filter_state: null,
         filter_operator_name: null,
         filter_region: null,
     };
    console.log(`📊 [Dashboard fetchDataForExhibition] Buscando dados para Exibição (${exhibitionDateRange}):`, exhibitionRpcFilters);


    const previousDateParams = dataUtils.getDateRangeParams(exhibitionDateRange);

    const previousExhibitionRpcFilters = {
         start_date: previousDateParams.previous_start_date,
         end_date: previousDateParams.previous_end_date,
         filter_state: null,
         filter_operator_name: null,
         filter_region: null,
    };


    try {
      console.log("📊 [Dashboard fetchDataForExhibition] Calling Promise.all for exhibition data...");

      const metricsExhibitionResult = await dataUtils.getPerformanceMetrics({
           currentFilters: exhibitionRpcFilters,
           previousFilters: previousExhibitionRpcFilters,
       });
      console.log("📊 [Dashboard] Raw metricsExhibitionResult (separate call):", metricsExhibitionResult);

      if (metricsExhibitionResult.error) throw metricsExhibitionResult.error;


      const [
          hourlyDataExhibitionResult,
           tabulationDistributionExhibitionResult,
      ] = await Promise.all([
          dataUtils.getTimeSeriesData(exhibitionRpcFilters),
          dataUtils.getTabulationDistribution(exhibitionRpcFilters),
      ]);


      console.log("📊 [Dashboard] Raw hourlyDataExhibitionResult:", hourlyDataExhibitionResult);
      console.log("📊 [Dashboard] Raw tabulationDistributionExhibitionResult:", tabulationDistributionExhibitionResult);

      if (hourlyDataExhibitionResult.error) console.error("📊 [Dashboard] Erro ao carregar dados horários de exibição:", hourlyDataExhibitionResult.error);
      if (tabulationDistributionExhibitionResult.error) console.error("📊 [Dashboard] Erro ao carregar tabulações de exibição:", tabulationDistributionExhibitionResult.error);


      setMetricsToday({
          current: metricsExhibitionResult.current || null,
          previous: metricsExhibitionResult.previous || null,
      });
      setHourlyDataToday(hourlyDataExhibitionResult.data || []);
      setTabulationDistributionToday(tabulationDistributionExhibitionResult.data || []);

      console.log(`📊 [Dashboard fetchDataForExhibition] Dados Modo Exibição (${exhibitionDateRange}) carregados.`, { metrics: metricsExhibitionResult.current, hourlyData: (hourlyDataExhibitionResult.data || []).length, tabulationDistribution: (tabulationDistributionExhibitionResult.data || []).length });

    } catch (err) {
      console.error("📊 [Dashboard] Erro geral ao carregar dados de Exibição:", err);
      setErrorData("Falha ao carregar dados de exibição.");
      setMetricsToday({ current: null, previous: null });
      setHourlyDataToday([]);
      setTabulationDistributionToday([]);
    } finally {
      setIsLoadingData(false);
      console.log("📊 [Dashboard fetchDataForExhibition] Carregamento finalizado. isLoadingData:", false);
    }
  }, [exhibitionDateRange]);


  useEffect(() => {
    const fetchInitialLists = async () => {
      try {
        console.log("📊 [Dashboard] Buscando listas iniciais de operadores, estados e regiões...");
        const [operatorsResult, statesListResult, regionsListResult] = await Promise.all([
          dataUtils.getOperators(),
          dataUtils.getStates(),
          dataUtils.getRegions(),
        ]);
        console.log("📊 [Dashboard] Raw operatorsResult:", operatorsResult);
        console.log("📊 [Dashboard] Raw statesListResult:", statesListResult);
        console.log("📊 [Dashboard] Raw regionsListResult:", regionsListResult);

        if (operatorsResult.error) console.error("📊 [Dashboard] Erro ao carregar operadores:", operatorsResult.error);
        if (statesListResult.error) console.error("📊 [Dashboard] Erro ao carregar estados:", statesListResult.error);
        if (regionsListResult.error) console.error("📊 [Dashboard] Erro ao carregar regiões:", regionsListResult.error);


        setOperatorsList(operatorsResult.data || []);
        setStatesList(statesListResult.data || []);
        setRegionsList(regionsListResult.data || []);
        console.log("📊 [Dashboard] Listas iniciais carregadas.", { operators: (operatorsResult.data || []).length, states: (statesListResult.data || []).length, regions: (regionsListResult.data || []).length });
      } catch (err) {
        console.error("📊 [Dashboard] Erro geral ao carregar listas iniciais:", err);
        setErrorData("Falha ao carregar listas iniciais. Tente recarregar a página.");
        setOperatorsList([]);
        setStatesList([]);
        setRegionsList([]);
        setIsLoadingData(false);
      }
    };

    if (operatorsList.length === 0 || statesList.length === 0 || regionsList.length === 0) {
      fetchInitialLists();
    }
  }, [operatorsList.length, statesList.length, regionsList.length]);


  useEffect(() => {
    if (displayMode === 'navigation') {
      if (operatorsList.length > 0 || selectedOperatorId === 'all') {
        fetchDataForFilters();
      } else {
        console.log("📊 [Dashboard useEffect] Aguardando lista de operadores para buscar dados filtrados pela primeira vez.");
        if (!isLoadingData) setIsLoadingData(true);
        if (errorData) setErrorData(null);
      }
    }
  }, [filters, selectedOperatorId, operatorsList.length, displayMode, fetchDataForFilters]);


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
      if (!tabulationDistributionNav) return [];

      const filteredData = tabulationDistributionNav.filter(item => {
          const lowerTab = item.tabulation ? String(item.tabulation).trim().toLowerCase() : '';
          return lowerTab !== 'endereço confirmado' && !tempoPerdidoTabulations.includes(lowerTab);
      });

      return filteredData
          .sort((a, b) => b.count - a.count)
          .map(d => ({ label: d.tabulation, value: d.count }));

  }, [tabulationDistributionNav, tempoPerdidoTabulations]);

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
                <OperationsOverview currentMetrics={metrics.current} previousMetrics={metrics.previous} />

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
                       Distribuição por Tabulação (Atendidas Válidas)
                     </h3>
                     <div className="flex-grow relative" style={{ height: '320px' }}>
                       {showTabulationPlaceholderNav ? (
                         <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                           Sem dados de tabulação válida para o período/filters selecionados.
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
                          {brazilRegions.map((region) => (
                            <option key={region} value={region}>
                              {region === 'all' ? 'Sem Destaque' : region}
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
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                          Sem dados geográficos para o período/filters selecionados.
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
            />

          </main>
        )}


    </div>
  );
}

export default Dashboard;