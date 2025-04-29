import React, { useRef, useEffect, useMemo } from 'react';
import Chart from 'chart.js/auto';

function LineChart({ data, title }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;

        return {
            type: 'line',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: title || 'Valor',
                    data: data.map(d => d.value),
                    borderColor: 'rgb(59 130 246 / 0.9)',
                    backgroundColor: 'rgb(59 130 246 / 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 750,
                    easing: 'easeOutQuart'
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: !!title,
                        text: title,
                        font: { size: 14 }
                    },
                    tooltip: {
                        backgroundColor: 'rgb(30 41 59 / 0.9)',
                        titleFont: { weight: 'bold' },
                        bodyFont: { size: 12 },
                        padding: 10,
                        cornerRadius: 4,
                        displayColors: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            maxTicksLimit: 6,
                            font: { size: 10 },
                            callback: function(value) {
                                if (value === 0) return '0';
                                if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                if (value >= 1000) return (value / 1000).toFixed(0) + 'k';
                                return value.toLocaleString('pt-BR');
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: { size: 10 },
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: data.length > 10 ? Math.ceil(data.length / 2) : data.length
                        },
                        grid: { display: false }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
            }
        };
    }, [data, title]);

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

    return <canvas ref={chartRef}></canvas>;
}

export default React.memo(LineChart);