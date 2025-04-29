import React, { useRef, useEffect, useMemo } from 'react';
import Chart from 'chart.js/auto';

function BarChart({ data, title, horizontal = false }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        const values = data.map(d => d.value);
        const maxValue = values.length > 0 ? Math.max(...values) : 0;
        const axisMax = maxValue === 0 ? 1 : Math.ceil(maxValue * 1.1) + (maxValue < 10 && maxValue > 0 ? 2 : (maxValue > 0 ? 5 : 0));
        const indexAxis = horizontal ? 'y' : 'x';
        const valueAxis = horizontal ? 'x' : 'y';

        return {
            type: 'bar',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: title || 'Valor',
                    data: values,
                    backgroundColor: 'rgba(59, 130, 246, 0.7)',
                    borderColor: 'rgb(59, 130, 246)',
                    borderWidth: 1,
                    borderRadius: 3,
                }]
            },
            options: {
                indexAxis,
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 1000,
                    delay: 1000,
                    easing: 'easeOutQuart'
                },
                layout: {
                    padding: {
                        top: 10,
                        right: horizontal ? 20 : 10,
                        bottom: horizontal ? 10 : 30,
                        left: horizontal ? 20 : 20
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
                    [valueAxis]: {
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
                                if (value === 0) return '0';
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value.toLocaleString('pt-BR');
                            }
                        }
                    },
                    [indexAxis]: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            autoSkip: false,
                            maxRotation: horizontal ? 0 : 45,
                            minRotation: horizontal ? 0 : 45,
                            font: { size: 10 },
                            color: '#475569'
                        }
                    }
                },
            }
        };
    }, [data, title, horizontal]);

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
        return null;
    }

    return (
        <div data-name="bar-chart-container" className="relative w-full h-full">
            <canvas ref={chartRef}></canvas>
        </div>
    );
}

export default React.memo(BarChart);