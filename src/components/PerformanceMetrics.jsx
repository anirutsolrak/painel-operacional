import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { motion } from 'framer-motion';
import dataUtils from '../utils/dataUtils';
import BarChart from './charts/BarChart.jsx'; // Keep BarChart import
import DoughnutChart from './charts/DoughnutChart.jsx';
import LineChart from './charts/LineChart.jsx'; // Keep LineChart import


// Componente interno para Gráfico de Pizza/Doughnut
// Moved DoughnutChart component definition here if it wasn't in its own file
// If DoughnutChart is already in its own file (DoughnutChart.jsx), this definition can be removed
// Assuming it's in its own file as per typical project structure and import above

// Componente de Métricas de Performance (Modo Navegação)
// REMOVED tabulationDistributionData prop as it's no longer used here
function PerformanceMetrics({ metrics, timeSeriesData, goalValue, operatorsList, selectedOperatorId }) {
    console.log("[PerformanceMetrics] Rendering with metrics:", metrics, "timeSeriesData:", timeSeriesData ? timeSeriesData.length : 0, "items", "goalValue:", goalValue, "selectedOperatorId:", selectedOperatorId);

    // Define the list of tabulations that are considered "Tempo Perdido" / "Não Efetivas" based on previous discussion
    // REMOVED tempoPerdidoTabulations useMemo as it's only used for filtering tabulations, which is now done in Dashboard


  const hourlyChartData = useMemo(() => {
    if (!timeSeriesData) return [];
    return timeSeriesData.map(d => ({ label: `${d.hora.toString().padStart(2, '0')}:00`, value: d.chamadas }));
  }, [timeSeriesData]);

  const attendedVsOthersData = useMemo(() => {
     // Use ligaçõesAtendidasCount and totalLigações directly from metrics
     const attendedCount = metrics?.ligaçõesAtendidasCount || 0;
     const totalCalls = metrics?.totalLigações || 0;
     const othersCount = totalCalls - attendedCount; // Everything not 'Atendida'

     return [
       { label: 'Atendidas', value: attendedCount },
       { label: 'Outras', value: othersCount },
     ].filter(d => d.value > 0); // Only include slices with value > 0
   }, [metrics]);


   // nonAttendedBreakdownData is not used


  const formattedTMA = useMemo(
    () => dataUtils.formatDuration(metrics?.tma),
    [metrics?.tma]
  );

    const showMetricsPlaceholders = !metrics || (attendedVsOthersData.length === 0); // Removed check for goalChartData length here
    const showHourlyPlaceholder = !timeSeriesData || timeSeriesData.length === 0 || hourlyChartData.every(d => d.value === 0);
    // REMOVED showTabulationPlaceholder as the chart is moved


   // --- Lógica e dados para a Meta (segundo gráfico de pizza) ---
   const isOperatorSelected = selectedOperatorId !== 'all';
   const metaTitle = isOperatorSelected ? `Meta Operador` : `Meta Logística`;

   const calculatedGoalValue = useMemo(() => {
       const numericGoal = parseFloat(goalValue);
       if (isNaN(numericGoal) || numericGoal <= 0) return 0;

       if (!isOperatorSelected) {
           return numericGoal;
       } else {
           const totalOperators = operatorsList?.length || 1;
           return numericGoal / totalOperators;
       }
   }, [goalValue, isOperatorSelected, operatorsList?.length]);

   const formattedGoalValue = useMemo(() => {
        if (calculatedGoalValue === 0) return 'Defina a Meta';
        if (!isOperatorSelected) {
             return Math.round(calculatedGoalValue).toLocaleString('pt-BR');
        } else {
             if (typeof calculatedGoalValue === 'number' && isFinite(calculatedGoalValue)) {
                 return calculatedGoalValue.toFixed(1).toLocaleString('pt-BR');
             }
             return 'N/A';
        }

   }, [calculatedGoalValue, isOperatorSelected]);

    const callsRealized = metrics?.sucessoTabulacoesCount || 0;
    const callsRemaining = Math.max(0, calculatedGoalValue - callsRealized);


   const goalChartData = useMemo(() => {
         if (calculatedGoalValue <= 0) return [];

         if (callsRealized >= calculatedGoalValue && calculatedGoalValue > 0) {
            return [
               { label: 'Realizado', value: calculatedGoalValue },
               { label: 'Restante', value: 0 }
            ];
         }

         return [
             { label: 'Realizado', value: callsRealized },
             { label: 'Restante', value: callsRemaining }
         ];

   }, [calculatedGoalValue, callsRealized, callsRemaining]);


   const percentageAchieved = useMemo(() => {
       if (calculatedGoalValue <= 0) return 0;
       const percentage = (callsRealized / calculatedGoalValue) * 100;
       return Math.min(100, percentage);
   }, [callsRealized, calculatedGoalValue]);

    const goalCenterText = useMemo(() => {
        if (calculatedGoalValue <= 0) return 'Defina a Meta';
        return `${percentageAchieved.toFixed(0)}%`;
    }, [percentageAchieved, calculatedGoalValue]);


    // The tabulation distribution is now directly fetched and likely used elsewhere, not generated here
    // const showTabulationPlaceholder = !metrics || !metrics.tabulacoes || Object.keys(metrics.tabulacoes).length === 0;


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      data-name="performance-metrics"
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8" // This grid contains the two pie charts and the hourly chart
    >
      {/* Card Status das Ligações (Pie Charts) */}
      <div
        data-name="metrics-details-pies"
        className="bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col gap-4"
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-0">
          Status das Ligações
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow min-h-[250px] relative">
            {showMetricsPlaceholders ? (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-500 col-span-2">
                           Sem dados de status para o período/filters selecionados.
                 </div>
            ) : (
                <>
                  {/* Gráfico 1: Atendidas vs Outras (com TMA central) */}
                  <div className="relative h-[200px] sm:h-auto">
                    <DoughnutChart
                       data={attendedVsOthersData}
                       title="Atendidas vs Outras"
                       colors={['#3b82f6', '#cbd5e1']}
                    />
                    {metrics && (metrics?.tma !== undefined && metrics?.tma !== null) && (
                       <motion.div
                         initial={{ opacity: 0, scale: 0.8 }}
                         animate={{ opacity: 1, scale: 1 }}
                         transition={{ duration: 0.3, delay: 1.2 }}
                         className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                         style={{ zIndex: 1 }}
                       >
                         <span className="text-xl font-semibold text-slate-700">
                           {formattedTMA}
                         </span>
                         <span className="text-xs text-slate-500 -mt-1">TMA</span>
                       </motion.div>
                    )}
                  </div>

                  {/* Gráfico 2: Meta Logística/Operador */}
                  <div className="relative h-[200px] sm:h-auto">
                       {calculatedGoalValue > 0 ? (
                           <DoughnutChart
                             data={goalChartData}
                             title={metaTitle}
                             colors={['#10b981', '#e5e7eb']}
                           />
                       ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-center px-4">
                               Meta {isOperatorSelected ? 'do Operador' : 'da Logística'} inválida ou não definida.
                            </div>
                       )}

                       {/* Texto central para o gráfico de Meta (sobreposto) */}
                       <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, delay: 1.2 }}
                          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                          style={{ zIndex: 1 }}
                        >
                           {calculatedGoalValue > 0 ? (
                              <>
                                <span className="text-xl font-semibold text-slate-700">
                                   {goalCenterText}
                                </span>
                               </>
                            ) : (
                              null
                            )}
                         </motion.div>
                           {calculatedGoalValue > 0 && (
                                <motion.div
                                   initial={{ opacity: 0, y: 10 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ duration: 0.3, delay: 1.3 }}
                                   className="absolute inset-x-0 bottom-4 text-center pointer-events-none"
                                    style={{ zIndex: 1 }}
                                >
                                    <span className="text-xs text-slate-500">
                                        Meta: {formattedGoalValue}
                                    </span>
                                </motion.div>
                           )}

                  </div>
                </>
            )}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 1.4 }}
          className="mt-4 bg-slate-50 p-3 rounded-md text-center border border-slate-200"
        >
          <div className="text-sm text-slate-600">
            Total de Ligações (Período)
          </div>
          <div className="text-xl font-semibold text-slate-800 mt-1">
            {metrics?.totalLigações !== undefined && metrics.totalLigações !== null
              ? metrics.totalLigações.toLocaleString('pt-BR')
              : '0'}
          </div>
        </motion.div>
      </div>

      {/* Card Volume por Hora (Bar Chart) - Changed back to BarChart */}
      <div
        data-name="metrics-chart-hourly"
        className="bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col"
      >
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          Volume por Hora (08-20h)
        </h3>
        <div className="flex-grow relative" style={{ height: '320px' }}>
           {showHourlyPlaceholder ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                 Sem dados horários para o período/filters selecionados.
              </div>
           ) : (
              <BarChart data={hourlyChartData} title="" horizontal={false} /> 
           )}
        </div>
      </div>

       {/* REMOVED Tabulation Distribution Bar Chart Card from here */}

    </motion.div>
  );
}

export default PerformanceMetrics;