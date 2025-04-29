import React, { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import dataUtils from '../utils/dataUtils';
import BarChart from '../components/charts/BarChart.jsx';
import DoughnutChart from '../components/charts/DoughnutChart.jsx';
import LineChart from '../components/charts/LineChart.jsx';

function ExhibitionView({ metrics, previousMetrics, hourlyData, tabulationDistribution, goalValue, operatorsList, selectedOperatorId, KPI_Card, selectedDateRange, isLoading, error }) {

    console.warn("✨📊 [ExhibitionView] Render. Props received:", {
        metrics,
        previousMetrics,
        hourlyData: hourlyData ? hourlyData.length : 0,
        tabulationDistribution: tabulationDistribution ? tabulationDistribution.length : 0,
        goalValue,
        selectedOperatorId,
        selectedDateRange,
        isLoading,
        error
    });

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

    const attendedVsOthersData = useMemo(() => {
        console.log("✨📊 [ExhibitionView] Calculating attendedVsOthersData. Input metrics:", metrics);
        const attendedCount = metrics?.ligaçõesAtendidasCount || 0;
        const totalCalls = metrics?.totalLigações || 0;
        const othersCount = totalCalls - attendedCount;

        const data = [
            { label: 'Atendidas', value: attendedCount },
            { label: 'Outras', value: othersCount },
        ].filter(d => d.value > 0);

        console.log("✨📊 [ExhibitionView] attendedVsOthersData:", data);
        return data;
    }, [metrics]);

    const hourlyCallsData = useMemo(() => {
        console.log("✨📊 [ExhibitionView] Calculating hourlyCallsData. Input hourlyData:", hourlyData);
        if (!hourlyData) return [];
        const data = hourlyData.map(d => ({ label: `${d.hora.toString().padStart(2, '0')}:00`, value: d.chamadas }));
        console.log("✨📊 [ExhibitionView] hourlyCallsData:", data);
        return data;
    }, [hourlyData]);

    const topTabulationsData = useMemo(() => {
        console.log("✨📊 [ExhibitionView] Calculating topTabulationsData. Input tabulationDistribution:", tabulationDistribution);
        if (!tabulationDistribution) return [];

         const filteredData = tabulationDistribution.filter(item => {
             const lowerTab = item.tabulation ? String(item.tabulation).trim().toLowerCase() : '';
             return lowerTab !== 'endereço confirmado' && !tempoPerdidoTabulations.includes(lowerTab);
         });

         const data = filteredData
             .sort((a, b) => b.count - a.count)
             .slice(0, 5)
             .map(d => ({ label: d.tabulation, value: d.count }));

        console.log("✨📊 [ExhibitionView] topTabulationsData:", data);
        return data;
      }, [tabulationDistribution, tempoPerdidoTabulations]);

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

     const formattedTMA = useMemo(
        () => dataUtils.formatDuration(metrics?.tma),
        [metrics?.tma]
     );
      const formattedTempoPerdido = useMemo(
         () => dataUtils.formatDuration(metrics?.tempoPerdidoSegundos),
         [metrics?.tempoPerdidoSegundos]
      );
      const formattedTaxaAbandono = useMemo(
         () => dataUtils.formatPercentage(metrics?.taxaAbandono),
         [metrics?.taxaAbandono]
      );
       const formattedTaxaSucesso = useMemo(
           () => dataUtils.formatPercentage(metrics?.taxaSucesso),
           [metrics?.taxaSucesso]
       );
      const formattedTaxaNaoEfetivo = useMemo(
          () => dataUtils.formatPercentage(metrics?.taxaNaoEfetivo),
          [metrics?.taxaNaoEfetivo]
      );

     const totalCallsTrend = dataUtils.calculateTrend(metrics?.totalLigações, previousMetrics?.totalLigações);
     const attendedTrend = dataUtils.calculateTrend(metrics?.ligaçõesAtendidasCount, previousMetrics?.ligaçõesAtendidasCount);
     const abandonTrend = dataUtils.calculateTrend(metrics?.ligaçõesAbandonadasCount, previousMetrics?.ligaçõesAbandonadasCount);
     const tempoPerdidoTrend = dataUtils.calculateTrend(metrics?.tempoPerdidoSegundos, previousMetrics?.tempoPerdidoSegundos);
     const sucessoRateTrend = dataUtils.calculateTrend(metrics?.taxaSucesso, previousMetrics?.taxaSucesso);
     const naoEfetivoRateTrend = dataUtils.calculateTrend(metrics?.taxaNaoEfetivo, previousMetrics?.taxaNaoEfetivo); // Corrigido para naoEfetivoRateTrend
     const tmaTrend = dataUtils.calculateTrend(metrics?.tma, previousMetrics?.tma);

    const hasMetricsData = metrics && (metrics.totalLigações > 0 || metrics.ligaçõesAtendidasCount > 0 || metrics.ligaçõesAbandonadasCount > 0 || metrics.ligaçõesFalhaCount > 0 || metrics.sucessoTabulacoesCount > 0);
    const hasHourlyData = hourlyCallsData.length > 0;
    const hasTabulationData = topTabulationsData.length > 0;

    const showMetricsPlaceholder = !isLoading && !error && !hasMetricsData;
    const showHourlyPlaceholder = !isLoading && !error && !hasHourlyData;
    const showTabulationPlaceholder = !isLoading && !error && !hasTabulationData;

    console.log("✨📊 [ExhibitionView] Placeholder states:", {
        showMetricsPlaceholder,
        showHourlyPlaceholder,
        showTabulationPlaceholder
    });

    const dateRangeSuffix = selectedDateRange === 'today' ? '(Hoje)' : selectedDateRange === 'week' ? '(Últimos 7 Dias)' : '';

    return (
        <div className="dashboard-container p-4">
            {isLoading ? (
                <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-slate-500 text-lg">
                    <i className="fas fa-spinner fa-spin mr-3"></i> Carregando dados de exibição...
                    <p className="mt-2 text-sm">Aguardando dados do banco.</p>
                </div>
            ) : error ? (
                <div className="flex-grow flex flex-col items-center justify-center min-h-[400px] text-red-600 text-lg">
                    <i className="fas fa-exclamation-triangle mb-2 text-xl"></i>
                    <p className="text-base font-semibold">Erro ao carregar dados de exibição:</p>
                    <p className="mt-1 text-sm text-slate-700">{error}</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                        <KPI_Card title={`Total Ligações ${dateRangeSuffix}`} value={metrics?.totalLigações?.toLocaleString('pt-BR') || '0'} trendValue={totalCallsTrend.value} trendDirection={totalCallsTrend.direction} lowerIsBetter={false}/>
                        <KPI_Card title={`Atendidas ${dateRangeSuffix}`} value={metrics?.ligaçõesAtendidasCount?.toLocaleString('pt-BR') || '0'} trendValue={attendedTrend.value} trendDirection={attendedTrend.direction} lowerIsBetter={false}/>
                        <KPI_Card title="Taxa Abandono (Geral)" value={formattedTaxaAbandono} trendValue={abandonTrend.value} trendDirection={abandonTrend.direction} lowerIsBetter={true}/>
                        <KPI_Card
                            title="Tempo Perdido (Não Efetivas)"
                            value={formattedTempoPerdido}
                            trendValue={tempoPerdidoTrend.value}
                            trendDirection={tempoPerdidoTrend.direction}
                            lowerIsBetter={true}
                        />
                        <KPI_Card title="Taxa Sucesso (Tab.)" value={formattedTaxaSucesso} trendValue={sucessoRateTrend.value} trendDirection={sucessoRateTrend.direction} lowerIsBetter={false}/>
                        <KPI_Card title="Taxa Não Efetivo (Tab.)" value={formattedTaxaNaoEfetivo} trendValue={naoEfetivoRateTrend.value} trendDirection={naoEfetivoRateTrend.direction} lowerIsBetter={true}/>

                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 flex flex-col h-full">
                          <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-3">
                            Status das Ligações {dateRangeSuffix}
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow min-h-[250px] relative">
                              {showMetricsPlaceholder ? (
                                   <div className="absolute inset-0 flex items-center justify-center text-slate-500 col-span-2">
                                      Sem dados de status para o período/filtros selecionados.
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
                                             colors={['#10b981', '#e5e7eb']}
                                           />
                                       ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-center px-4">
                                               Meta {isOperatorSelected ? 'do Operador' : 'da Logística'} inválida ou não definida.
                                            </div>
                                       )}

                                        
                                        {calculatedGoalValue > 0 && (
                                             <motion.div
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ duration: 0.3, delay: 1.2 }}
                                                className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                                                 style={{ zIndex: 1 }}
                                             >
                                                  <span className="text-xl font-semibold text-slate-700">
                                                     {goalCenterText}
                                                  </span>
                                             </motion.div>
                                        )}

                                         
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
                       Total de Ligações {dateRangeSuffix}
                     </div>
                     <div className="text-xl font-semibold text-slate-800 mt-1">
                       {metrics?.totalLigações !== undefined && metrics.totalLigações !== null
                         ? metrics.totalLigações.toLocaleString('pt-BR')
                         : '0'}
                     </div>
                   </motion.div>
                </div>
                <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col h-full">
                    <h3 className="text-base lg:text-lg font-semibold text-slate-800 mb-3">Volume por Hora {dateRangeSuffix} (08-20h)</h3>
                    <div className="flex-grow relative min-h-[250px]">
                         {showHourlyPlaceholder ? (
                              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                 Sem dados horários para o período/filters selecionados.
                              </div>
                         ) : (
                            <BarChart data={hourlyCallsData} title="" horizontal={false} />
                         )}
                    </div>
                </div>
            </div>
             <div className="grid grid-cols-1 mb-8">
                 <div className="bg-white rounded-lg shadow-md border border-slate-200 p-6 flex flex-col">
                     <h3 className="text-lg font-semibold text-slate-800 mb-4">Top 5 Motivos {dateRangeSuffix}</h3>
                     <div className="flex-grow relative min-h-[300px]">
                         {showTabulationPlaceholder ? (
                              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                                  Sem dados de tabulação para o período/filters selecionados.
                              </div>
                         ) : (
                             <BarChart
                                 data={topTabulationsData}
                                 horizontal={true}
                                 title=""
                             />
                         )}
                     </div>
                 </div>
             </div>
             </>
        )} 
        </div> 
    );
}

export default ExhibitionView;