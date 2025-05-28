import React, { useRef, useEffect, useMemo } from 'react';
import Chart from 'chart.js/auto';

function BarChart({ data, title, horizontal = false, options: propOptions }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;
        const values = data.map(d => d.value);
        const maxValue = values.length > 0 ? Math.max(...values) : 0;
        const axisMax = maxValue === 0 ? 1 : Math.ceil(maxValue * 1.1) + (maxValue < 10 && maxValue > 0 ? 2 : (maxValue > 0 ? 5 : 0));
        const indexAxisComputed = horizontal ? 'y' : 'x';
        const valueAxisComputed = horizontal ? 'x' : 'y';

        const defaultOptions = {
            indexAxis: indexAxisComputed,
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                delay: horizontal ? 500: 200, 
                easing: 'easeOutQuart'
            },
            layout: {
                padding: {
                    top: title ? 5 : 10,
                    right: horizontal ? 20 : 10,
                    bottom: horizontal ? 10 : 5, 
                    left: horizontal ? ( values.some(v => v >= 1000) ? 35 : 20) : ( values.some(v => v >= 1000) ? 30 : 20)
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: !!title,
                    text: title,
                    font: { size: 14, weight: 'normal' },
                    color: '#334155',
                    padding: { bottom: 15 }
                },
                tooltip: {
                    backgroundColor: 'rgb(30 41 59 / 0.9)',
                    titleFont: { weight: 'bold' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 4,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label && context.dataset.label !== 'Valor') {
                                label += ': ';
                            } else {
                                label = '';
                            }
                            const value = horizontal ? context.parsed.x : context.parsed.y;
                            if (value !== null && value !== undefined) {
                                label += value.toLocaleString('pt-BR');
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                [valueAxisComputed]: {
                    beginAtZero: true,
                    max: axisMax,
                    grid: {
                        drawBorder: false,
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        maxTicksLimit: horizontal ? 8 : 6,
                        font: { size: 10 },
                        color: '#64748b',
                        callback: function(value) {
                            if (value === 0 && !horizontal) return '0'; // Show 0 for vertical axis
                            if (value === 0 && horizontal) return ''; // Hide 0 for horizontal value axis if needed
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                            return value.toLocaleString('pt-BR');
                        }
                    }
                },
                [indexAxisComputed]: {
                    type: 'category', // Forçando tipo categoria para o eixo de índice/labels
                    grid: {
                        display: false
                    },
                    ticks: {
                        autoSkip: horizontal ? true : false, // AutoSkip para horizontal, não para vertical (hourly)
                        maxRotation: horizontal ? 0 : 45,
                        minRotation: horizontal ? 0 : 45,
                        font: { size: 10 },
                        color: '#475569',
                    }
                }
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...propOptions, // Mescla com opções passadas por props
            scales: { // Garante que a mesclagem de scales seja profunda
                ...(defaultOptions.scales || {}),
                ...(propOptions?.scales || {}),
                [indexAxisComputed]: {
                    ...(defaultOptions.scales?.[indexAxisComputed] || {}),
                    ...(propOptions?.scales?.[indexAxisComputed] || {}),
                    type: 'category', // Garante que 'category' seja mantido ou definido
                     ticks: {
                        ...(defaultOptions.scales?.[indexAxisComputed]?.ticks || {}),
                        ...(propOptions?.scales?.[indexAxisComputed]?.ticks || {}),
                    }
                },
                [valueAxisComputed]: {
                    ...(defaultOptions.scales?.[valueAxisComputed] || {}),
                    ...(propOptions?.scales?.[valueAxisComputed] || {}),
                     ticks: {
                        ...(defaultOptions.scales?.[valueAxisComputed]?.ticks || {}),
                        ...(propOptions?.scales?.[valueAxisComputed]?.ticks || {}),
                         callback: propOptions?.scales?.[valueAxisComputed]?.ticks?.callback || defaultOptions.scales[valueAxisComputed].ticks.callback
                    }
                }
            },
             plugins: {
                ...(defaultOptions.plugins || {}),
                ...(propOptions?.plugins || {}),
                tooltip: {
                     ...(defaultOptions.plugins?.tooltip || {}),
                    ...(propOptions?.plugins?.tooltip || {}),
                    callbacks : {
                        ...(defaultOptions.plugins?.tooltip?.callbacks || {}),
                        ...(propOptions?.plugins?.tooltip?.callbacks || {}),
                         label: propOptions?.plugins?.tooltip?.callbacks?.label || defaultOptions.plugins.tooltip.callbacks.label
                    }
                }
            }
        };


        return {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: title || 'Valor',
                    data: values,
                    backgroundColor: data.map(d => d.color || (horizontal ? 'rgba(129, 140, 248, 0.7)' : 'rgba(59, 130, 246, 0.7)')),
                    borderColor: data.map(d => d.color ? d.color.replace('0.7', '1') : (horizontal ? 'rgb(129, 140, 248)' : 'rgb(59, 130, 246)')),
                    borderWidth: 1,
                    borderRadius: 3,
                }]
            },
            options: mergedOptions,
        };
    }, [data, title, horizontal, propOptions]);

    useEffect(() => {
        if (!chartRef.current || !chartConfig) {
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
        }
        
        chartInstance.current = new Chart(ctx, chartConfig);

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [chartConfig]);

    if (!data || data.length === 0) {
        // Pode retornar um placeholder ou nada
        return null; 
    }

    return (
        <div data-name="bar-chart-container" className="relative w-full h-full">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

export default React.memo(BarChart);