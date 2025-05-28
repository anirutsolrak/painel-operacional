import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

function DoughnutChart({
    data,
    title,
    colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6b7280'],
    showOverachievement = false,
    displayValuesAsAbsolute = false
}) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!data || data.length === 0 || !chartRef.current) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstance.current) {
            chartInstance.current.destroy();
            chartInstance.current = null;
        }

        let chartDataProcessed = [...data];
        const originalColors = [...colors];
        let isPercentageValuesForChart = false; // Flag para os valores que vão para as fatias do gráfico
        let originalAbsoluteValues = {}; // Para guardar valores absolutos para o tooltip

        // Salva os valores absolutos originais se eles existirem nos dados de entrada
        data.forEach(item => {
            if (item.absoluteValue !== undefined) {
                originalAbsoluteValues[item.label] = item.absoluteValue;
            }
        });


        if (showOverachievement && chartDataProcessed.length === 1 && chartDataProcessed[0].label === 'Realizado' && chartDataProcessed[0].value > 100) {
            const percentageTotal = chartDataProcessed[0].value;
            const superacaoValuePercentage = percentageTotal - 100;
            isPercentageValuesForChart = true;

            // Guarda o valor absoluto original do "Realizado" se disponível, para o tooltip da superação
            const absoluteRealizadoOriginal = originalAbsoluteValues['Realizado'] || chartDataProcessed[0].absoluteValue;

            chartDataProcessed = [
                { 
                    label: 'Meta Atingida', 
                    value: 100, 
                    color: '#10b981',
                    // Se a meta base (100%) tiver um valor absoluto, podemos calcular.
                    // Mas `calculatedGoalValue` não está disponível aqui.
                    // Por enquanto, o tooltip mostrará 100%.
                },
                { 
                    label: 'Superação', 
                    value: superacaoValuePercentage, 
                    color: '#f97316',
                    // O valor absoluto da superação é o total realizado menos a meta base.
                    // Se `absoluteRealizadoOriginal` e `calculatedGoalValue` fossem conhecidos, poderíamos calcular.
                    // Para o tooltip mostrar o valor absoluto da superação, precisamos dele.
                    // Por enquanto, o tooltip mostrará a porcentagem da superação.
                    // Se o `absoluteRealizadoOriginal` existe, e a meta base é 100% (implícito pela estrutura),
                    // o valor absoluto da superação é `absoluteRealizadoOriginal - (valor absoluto de 100% da meta)`.
                    // Esta parte é complexa sem ter o valor absoluto da meta base aqui.
                },
            ];
        } else if (chartDataProcessed.length === 1 && chartDataProcessed[0].label === 'Realizado' && chartDataProcessed[0].value <= 100) {
            isPercentageValuesForChart = true;
        }
        
        if (chartDataProcessed.find(item => item.label === 'Restante')) {
            isPercentageValuesForChart = false; // Se tem "Restante", os valores são absolutos para o gráfico
        }


        const timeoutId = setTimeout(() => {
            if (!chartRef.current) return;
            
            chartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartDataProcessed.map(d => d.label),
                    datasets: [{
                        label: title,
                        data: chartDataProcessed.map(d => d.value),
                        // Passa os absoluteValues originais para o tooltip via chart.js dataset
                        metaData: chartDataProcessed.map(d => ({
                            absoluteValue: originalAbsoluteValues[d.label] !== undefined ? originalAbsoluteValues[d.label] : d.absoluteValue,
                            isPercentageSlice: (d.label === 'Meta Atingida' || d.label === 'Superação') && isPercentageValuesForChart
                        }))
                    }],
                    
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    animation: {
                        duration: 1000,
                        delay: 800,
                    },
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                boxWidth: 12,
                                font: { size: 10 },
                                // Para garantir que as cores da legenda correspondam
                                 generateLabels: function(chart) {
                                    const data = chart.data;
                                    if (data.labels.length && data.datasets.length) {
                                        return data.labels.map(function(label, i) {
                                            const meta = chart.getDatasetMeta(0);
                                            const style = meta.controller.getStyle(i);
                                            return {
                                                text: label,
                                                fillStyle: style.backgroundColor,
                                                strokeStyle: style.borderColor,
                                                lineWidth: style.borderWidth,
                                                hidden: isNaN(data.datasets[0].data[i]) || meta.data[i].hidden,
                                                index: i
                                            };
                                        });
                                    }
                                    return [];
                                }
                            },
                        },
                        title: {
                            display: !!title,
                            text: title,
                            font: { size: 12 },
                            padding: { top: 5, bottom: 5 },
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    let label = context.label || '';
                                    if (label) {
                                        label += ': ';
                                    }
                                    
                                    const dataset = context.chart.data.datasets[context.datasetIndex];
                                    const currentMetaData = dataset.metaData && dataset.metaData[context.dataIndex];
                                    const parsedValue = context.parsed;

                                    if (parsedValue !== null) {
                                        if (displayValuesAsAbsolute && currentMetaData && currentMetaData.absoluteValue !== undefined && !currentMetaData.isPercentageSlice) {
                                            // Caso: Realizado/Restante (displayValuesAsAbsolute=true)
                                            label += currentMetaData.absoluteValue.toLocaleString('pt-BR');
                                        } else if (currentMetaData && currentMetaData.isPercentageSlice) {
                                            // Caso: Meta Atingida/Superação (valores do gráfico são %)
                                            label += parsedValue.toLocaleString('pt-BR') + '%';
                                        } else if (displayValuesAsAbsolute && currentMetaData && currentMetaData.absoluteValue !== undefined && (label === 'Meta Atingida' || label === 'Superação')) {
                                            // Caso especial para tooltip de Meta Atingida / Superação se tivermos o absoluto
                                            // Esta lógica precisaria ser mais robusta se quisermos mostrar absoluto para fatias de superação
                                            // Por enquanto, elas mostram % como definido acima.
                                            // Para que mostrassem absoluto, precisaríamos do valor absoluto da meta (100%) e do valor absoluto da superação.
                                            // A forma mais simples é mostrar % para estas fatias.
                                             label += parsedValue.toLocaleString('pt-BR') + '%';
                                        }
                                         else { // Fallback (ex: gráfico Atendidas vs Outras)
                                            label += parsedValue.toLocaleString('pt-BR');
                                        }
                                    }
                                    return label;
                                },
                            },
                        },
                    },
                     datasets: { // Aplicar cores aqui também para que a legenda pegue as cores corretas
                        doughnut: {
                             backgroundColor: chartDataProcessed.map((d, i) => d.color || originalColors[i % originalColors.length]),
                             hoverOffset: 4,
                             borderWidth: 1,
                        }
                    }
                },
            });
        }, 600);

        return () => {
            clearTimeout(timeoutId);
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [data, title, colors, showOverachievement, displayValuesAsAbsolute]);

    if (!data || data.length === 0) {
        return null;
    }

    return <canvas ref={chartRef}></canvas>;
}

export default DoughnutChart;