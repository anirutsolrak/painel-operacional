import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import dataUtils from '../utils/dataUtils';
import BarChart from './charts/BarChart.jsx';
import DoughnutChart from './charts/DoughnutChart.jsx';

function PerformanceMetrics({ metrics, timeSeriesData, goalValue, operatorsList, selectedOperatorId }) {
  const hourlyChartData = useMemo(() => {
    if (!timeSeriesData) return [];
    return timeSeriesData.map(d => ({ label: `${d.hora.toString().padStart(2, '0')}:00`, value: d.chamadas }));
  }, [timeSeriesData]);

  const attendedVsOthersData = useMemo(() => {
     const attendedCount = metrics?.ligaçõesAtendidasCount || 0;
     const totalCalls = metrics?.totalLigações || 0;
     const othersCount = totalCalls - attendedCount;
     return [
       { label: 'Atendidas', value: attendedCount },
       { label: 'Outras', value: othersCount },
     ].filter(d => d.value > 0);
   }, [metrics]);

  const formattedTMA = useMemo(
    () => dataUtils.formatDuration(metrics?.tma),
    [metrics?.tma]
  );

  const showMetricsPlaceholders = !metrics || (attendedVsOthersData.length === 0);
  const showHourlyPlaceholder = !timeSeriesData || timeSeriesData.length === 0 || hourlyChartData.every(d => d.value === 0);
  const isOperatorSelected = selectedOperatorId !== 'all';
  const metaTitle = isOperatorSelected ? `Meta Operador` : `Meta Logística`;

  const calculatedGoalValue = useMemo(() => {
       const numericGoal = parseFloat(goalValue);
       if (isNaN(numericGoal) || numericGoal <= 0) return 0;
       if (!isOperatorSelected) {
           return numericGoal;
       } else {
           const totalOperators = operatorsList?.length || 1;
           if (totalOperators === 0) return numericGoal; 
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

   const goalChartData = useMemo(() => {
        if (calculatedGoalValue <= 0) return []; 
        
        const percentageAchieved = (callsRealized / calculatedGoalValue) * 100;
        
        if (percentageAchieved >= 100) {
            // Passa a porcentagem para o DoughnutChart, que irá decompor.
            // O valor absoluto de 'callsRealized' será usado para o tooltip se necessário.
            return [{
                label: 'Realizado', 
                value: percentageAchieved, 
                absoluteValue: callsRealized, // Passa o valor absoluto para o tooltip
                color: '#10b981' 
            }];
        }
        
        const callsRemainingValue = Math.max(0, calculatedGoalValue - callsRealized);
        return [
            { label: 'Realizado', value: callsRealized, absoluteValue: callsRealized, color: '#10b981' },
            { label: 'Restante', value: callsRemainingValue, absoluteValue: callsRemainingValue, color: '#e5e7eb' }
        ];
    }, [calculatedGoalValue, callsRealized]);


   const percentageAchievedText = useMemo(() => { 
       if (calculatedGoalValue <= 0) return 0;
       return (callsRealized / calculatedGoalValue) * 100;
   }, [callsRealized, calculatedGoalValue]);

    const goalCenterText = useMemo(() => {
        if (calculatedGoalValue <= 0) return 'Defina a Meta';
        return `${percentageAchievedText.toFixed(0)}%`;
    }, [percentageAchievedText, calculatedGoalValue]);

  const hourlyChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        x: {
            type: 'category',
            grid: {
                display: false,
            },
            ticks: {
                autoSkip: true,
                maxTicksLimit: 13,
                font: {
                    size: 10,
                },
            },
        },
        y: {
            beginAtZero: true,
            grid: {
                color: '#e2e8f0',
                borderColor: '#cbd5e1',
            },
            ticks: {
                font: {
                    size: 10,
                },
                callback: function (value) {
                    if (value >= 1000) {
                        return (value / 1000) + 'k';
                    }
                    return value;
                }
            }
        }
    },
    plugins: {
        legend: {
            display: false
        },
        tooltip: {
            backgroundColor: '#1e293b',
            titleColor: '#f8fafc',
            bodyColor: '#f8fafc',
            borderColor: '#334155',
            borderWidth: 1,
            padding: 10,
            cornerRadius: 4,
            displayColors: false,
            callbacks: {
                title: function (tooltipItems) {
                    return tooltipItems[0].label;
                },
                label: function (tooltipItem) {
                    return `Chamadas: ${tooltipItem.raw.value || tooltipItem.raw}`;
                }
            }
        }
    }
  }), []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      data-name="performance-metrics"
      className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
    >
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
                  <div className="relative h-[200px] sm:h-auto">
                       {calculatedGoalValue > 0 ? (
                           <DoughnutChart
                             data={goalChartData}
                             title={metaTitle}
                             showOverachievement={true} 
                             displayValuesAsAbsolute={true} 
                           />
                       ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-center px-4">
                               Meta {isOperatorSelected ? 'do Operador' : 'da Logística'} inválida ou não definida.
                            </div>
                       )}
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
              <BarChart 
                data={hourlyChartData} 
                title="" 
                horizontal={false}
                options={hourlyChartOptions}
              />
           )}
        </div>
      </div>
    </motion.div>
  );
}
export default PerformanceMetrics;